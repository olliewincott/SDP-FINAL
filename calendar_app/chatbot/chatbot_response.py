import re
import json
import openai
from datetime import datetime

from django.http import JsonResponse
from django.utils.html import escape
from django.utils.timezone import now as timezone_now, make_aware

from calendar_app.models import CalendarEvent, Reminder, ChatMessage, Task

def chatbot_response_logic(request):
    def parse_intent(text):
        text = text.lower()
        move_match = re.match(r".*(move|reschedule)\s+(.*?)\s+(to|at)\s+(\d{1,2}:\d{2})\s*(am|pm)?", text)
        if move_match:
            title = move_match.group(2).strip()
            time_str = move_match.group(4)
            meridian = move_match.group(5)
            if meridian:
                time_str += f" {meridian}"
            try:
                new_time = datetime.strptime(time_str, "%I:%M %p").time()
            except ValueError:
                new_time = datetime.strptime(time_str, "%H:%M").time()
            return ('move', title, new_time)

        rename_match = re.match(r".*(rename|change)\s+(.*?)\s+to\s+(.*)", text)
        if rename_match:
            old_title = rename_match.group(2).strip()
            new_title = rename_match.group(3).strip()
            return ('rename', old_title, new_title)

        delete_match = re.match(r".*(delete|remove)\s+(.*?)$", text)
        if delete_match:
            title = delete_match.group(2).strip()
            return ('delete', title)

        return None

    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        data = json.loads(request.body)
        user_message = data.get("message", "").strip()
        conversation_history = data.get("history", [])
        mode = data.get("mode", "event")

        if not user_message:
            return JsonResponse({"error": "Empty message."}, status=400)

        if not openai.api_key:
            return JsonResponse({"error": "OpenAI API Key is missing."}, status=400)

        today = timezone_now().date()
        now_time = timezone_now()

        ChatMessage.objects.create(user=request.user, role='user', content=user_message)

        # 🗓 Schedule / Agenda Mode
        if mode == "schedule" or any(keyword in user_message.lower() for keyword in ["schedule", "today", "plan"]):
            events = CalendarEvent.objects.filter(user=request.user, start_time__date=today).order_by('start_time')
            reminders = Reminder.objects.filter(user=request.user, reminder_time__date=today).order_by('reminder_time')
            tasks = Task.objects.filter(user=request.user, completed=False, due_date__date=today).order_by('due_date')

            event_lines = []
            reminder_lines = []
            task_lines = []

            def icon(title):
                title = title.lower()
                if "gym" in title or "exercise" in title: return "🏋️‍♂️"
                if "meeting" in title: return "💼"
                if "yoga" in title: return "🧘‍♂️"
                if "work" in title: return "🖥️"
                if "commute" in title: return "🚗"
                if "submit" in title or "report" in title: return "📝"
                if "water" in title: return "💧"
                if "breakfast" in title or "lunch" in title or "dinner" in title: return "🍽️"
                return "📌"

            # Build event section
            if events.exists():
                event_lines.append("<h3>🗓️ Today's Events:</h3><ul>")
                for event in events:
                    event_lines.append(
                        f"<li>{icon(event.title)} <strong>{escape(event.title)}</strong> — ⏰ {event.start_time.strftime('%I:%M %p')} → {event.end_time.strftime('%I:%M %p')}</li>"
                    )
                event_lines.append("</ul>")

            # Build reminder section
            if reminders.exists():
                reminder_lines.append("<h3>🔔 Today's Reminders:</h3><ul>")
                for reminder in reminders:
                    reminder_lines.append(
                        f"<li>📍 <strong>{escape(reminder.event.title)}</strong> — ⏰ {reminder.reminder_time.strftime('%I:%M %p')}</li>"
                    )
                reminder_lines.append("</ul>")

            # Build task section
            if tasks.exists():
                task_lines.append("<h3>✅ Today's Tasks:</h3><ul>")
                for task in tasks:
                    due_time = task.due_date.strftime("%I:%M %p") if task.due_date else "No Due Time"
                    task_lines.append(
                        f"<li>📝 <strong>{escape(task.title)}</strong> — (Due: ⏰ {due_time})</li>"
                    )
                task_lines.append("</ul>")

            # Assemble full bot reply
            sections = []
            if event_lines:
                sections.append("".join(event_lines))
            if reminder_lines:
                if sections: sections.append("<hr>")  # Separator
                sections.append("".join(reminder_lines))
            if task_lines:
                if sections: sections.append("<hr>")  # Separator
                sections.append("".join(task_lines))

            if sections:
                bot_response = f"<div>{''.join(sections)}</div><br>Would you like to rearrange or update anything?"
            else:
                bot_response = "🎉 You have no events, reminders or tasks scheduled today!"

            ChatMessage.objects.create(user=request.user, role='assistant', content=bot_response)
            return JsonResponse({"response": bot_response})

        # ✨ Default fallback to GPT-4 chat
        system_prompt = {
            "event": "Assist users in creating events and scheduling their day.",
            "agenda": "Assist users with planning today's tasks and priorities.",
            "wellness": "Encourage wellness breaks and positive habits.",
        }.get(mode, "Assist users with productivity.")

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages,
            max_tokens=500,
            temperature=0.6
        )

        bot_reply = response["choices"][0]["message"]["content"].strip()
        ChatMessage.objects.create(user=request.user, role='assistant', content=bot_reply)

        return JsonResponse({"response": bot_reply})

    except openai.OpenAIError as e:
        return JsonResponse({"error": f"OpenAI API Error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({"error": f"Server Error: {str(e)}"}, status=500)