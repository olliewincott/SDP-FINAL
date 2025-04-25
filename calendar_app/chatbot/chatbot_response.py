import re
import json
import openai
import logging
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.utils.timezone import now as timezone_now, make_aware
from django.db.models import Q, Avg
from calendar_app.models import (
    CalendarEvent, Reminder, Task, DailyWellness, 
    Category, EventCategory, ChatMessage
)

logger = logging.getLogger(__name__)

def chatbot_response_logic(request):
    def get_user_first_name():
        """Get user's first name, or username if first_name not available"""
        if request.user.first_name:
            return request.user.first_name
        return "Ollie"  # Default to Ollie since we know the username

    def parse_intent(text):
        text = text.lower().strip()

    # --- EVENT LOGIC ---
        event_patterns = [
            r"(?:add|schedule|create)\s+(?:an?\s+)?(?:event|meeting|session|activity)?\s*(?:called|named|for|about)?\s*[\"']?(.*?)[\"']?\s+(?:from|at)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)))?",
            r"(?:let's|can you|please)?\s*(?:schedule|add|create)\s+(?:an?\s+)?(?:event|meeting|session|activity)?\s*(?:called|named|for|about)?\s*[\"']?(.*?)[\"']?\s+(?:at|from)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)))?"
        ]

        def clean_title(raw_title):
            cleaned = re.sub(r"\b(event|meeting|session|activity|for|about|called|named|of|on|at|to|from|the|a|an)\b", "", raw_title, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            return cleaned.capitalize()


        for pattern in event_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()
                raw_title = groups[0].strip() if groups[0] else ""
                title = clean_title(raw_title)
                start_time = groups[1].strip() if len(groups) > 1 else None
                end_time = groups[2].strip() if len(groups) > 2 else None
                if start_time and end_time:
                    time_str = f"{start_time} to {end_time}"
                else:
                    time_str = start_time
                return ('event', 'create', {
                    'title': title,
                    'time': time_str,
                    'original_text': text
                })

        rename_event = re.match(r"(rename|change)\s+(event|meeting|session|activity)?\s*[\"']?(.*?)['\"]?\s+to\s+[\"']?(.*?)['\"]?", text, re.IGNORECASE)
        if rename_event:
            return ('event', 'rename', {
                'old_title': clean_title(rename_event.group(3)),
                'new_title': clean_title(rename_event.group(4))
            })


        move_event = re.match(r"(?:move|reschedule|update)\s+(?:event|meeting|session|activity)?\s*[\"']?(.*?)['\"]?\s+(?:from|at|to)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)))?", text, re.IGNORECASE)
        if move_event:
            raw_title = move_event.group(1).strip()
            raw_title = re.split(r",|i want|i'd like|i need|the time|to be|starting", raw_title, 1)[0].strip()
            title = clean_title(raw_title)
            start_time = move_event.group(2)
            end_time = move_event.group(3)
         
            if end_time:
                time_str = f"{start_time} to {end_time}"
                has_end_time = True
            else:
                time_str = start_time
                has_end_time = False

            return ('event', 'reschedule', {
                'title': title,
                'new_time': time_str,
                'has_end_time': has_end_time
            })

        delete_event = re.match(r"(?:delete|remove|cancel)\s+(?:event|meeting|session|activity)?\s*[\"']?(.*?)['\"]?$", text, re.IGNORECASE)
        if delete_event:
            return ('event', 'delete', {
                'title': clean_title(delete_event.group(1))
            })


    # --- TASK LOGIC ---
        add_task = re.match(r"(?:add|create)\s+(?:a\s+)?task\s+['\"]?(.*?)['\"]?(?:\s+due\s+(.*))?$", text)
        if add_task:
            return ('task', 'create', {'title': add_task.group(1).strip(), 'due_date': add_task.group(2).strip() if add_task.group(2) else None})

        update_task = re.match(r"(?:update|change|edit)\s+task\s+['\"]?(.*?)['\"]?\s+(?:to|with)\s+['\"]?(.*?)['\"]?$", text)
        if update_task:
            return ('task', 'update', {'old_title': update_task.group(1).strip(), 'new_title': update_task.group(2).strip()})

        delete_task = re.match(r"(?:delete|remove|cancel)\s+task\s+['\"]?(.*?)['\"]?$", text)
        if delete_task:
            return ('task', 'delete', {'title': delete_task.group(1).strip()})

    # --- REMINDER LOGIC ---
        duration_reminder = re.match(r"(?:remind(?: me)? to )(.+?)\s+in\s+(\d+)\s*(minutes?|hours?)", text)
        if duration_reminder:
            title = duration_reminder.group(1).strip()
            amount = int(duration_reminder.group(2))
            unit = duration_reminder.group(3).lower()

            now = timezone_now()
            if "hour" in unit:
                reminder_time = now + timedelta(hours=amount)
            else:
                reminder_time = now + timedelta(minutes=amount)

            return ('reminder', 'create', {'title': title, 'reminder_time_object': reminder_time})

        add_reminder = re.match(r"(?:add|create)\s+(?:a\s+)?reminder\s+['\"]?(.*?)['\"]?(?:\s+at\s+(.*))?$", text)
        if add_reminder:
            return ('reminder', 'create', {
                'title': add_reminder.group(1).strip(),
                'time': add_reminder.group(2).strip() if add_reminder.group(2) else None
            })

        delete_reminder = re.match(r"(?:delete|remove|cancel)\s+reminder\s+['\"]?(.*?)['\"]?$", text)
        if delete_reminder:
            return ('reminder', 'delete', {'title': delete_reminder.group(1).strip()})
        # Handle natural GPT-style reminders (e.g., "Scheduled a break at 9 PM")
        gpt_reminder_patterns = [
            r"(?:scheduled|set|added)\s+(?:a\s+)?(?:reminder|break|alarm)?\s*(?:for\s+)?(.+?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
            r"(?:reminder|alarm)\s+set\s+for\s+(.+?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
            r"(?:i(?:'ve)?\s+)?(?:set|created)\s+(?:a\s+)?reminder\s+for\s+(.+?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))"
        ]

        for pattern in gpt_reminder_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:   
                title = match.group(1).strip()
                time_str = match.group(2).strip()
                return ('reminder', 'create', {'title': title, 'time': time_str})


    # --- SCHEDULE / WELLNESS ---
        if any(kw in text for kw in ["schedule", "what do i have", "what's planned", "today", "plan my day"]):
            return ('schedule', 'view', None)

        if any(w in text for w in ["wellness", "wellbeing", "how am i doing", "health stats"]):
            return ('wellness', 'check', None)

        return None
    
    def create_event(request, user, title, time_str, original_text=None):
        try:
            now = timezone_now()
            
            if not title:
                return "Please specify what event you'd like to schedule."

            # Parse time string
            if not time_str and original_text:
                # Look for time range pattern first
                time_range_match = re.search(
                    r"(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
                    original_text,
                    re.IGNORECASE
                )
                if time_range_match:
                    time_str = f"{time_range_match.group(1)} to {time_range_match.group(2)}"
                else:
                    # Fall back to single time pattern
                    time_match = re.search(r"(\d{1,2}(?::\d{2})?\s*(?:am|pm))", original_text, re.IGNORECASE)
                    if time_match:
                        time_str = time_match.group(1)

            if not time_str:
                return "Please specify when the event should occur (e.g., 'at 3 PM' or '8 PM to 9 PM')"

            # Parse start and end times
            time_pattern = re.compile(r"""
                (\d{1,2})(?::(\d{2}))?\s*(am|pm)
                (?:\s+to\s+
                (\d{1,2})(?::(\d{2}))?\s*(am|pm))?
            """, re.IGNORECASE | re.VERBOSE)

            match = time_pattern.search(time_str)
            if not match:
                return "Please specify time in a format like '3 PM' or '8 PM to 9 PM'"

            # Get today's date
            today = now.date()

            # Parse start time
            start_hour = int(match.group(1))
            start_minute = int(match.group(2) or 0)
            start_ampm = match.group(3).lower()

            # Convert to 24-hour format
            if start_ampm == 'pm' and start_hour != 12:
                start_hour += 12
            elif start_ampm == 'am' and start_hour == 12:
                start_hour = 0

            # Create start_time as naive datetime first
            naive_start_time = datetime.combine(today, datetime.min.time().replace(
                hour=start_hour,
                minute=start_minute
            ))
            
            # Make timezone aware
            start_time = make_aware(naive_start_time)

            # If end time is specified, parse it
            if match.group(4):
                end_hour = int(match.group(4))
                end_minute = int(match.group(5) or 0)
                end_ampm = match.group(6).lower()

                if end_ampm == 'pm' and end_hour != 12:
                    end_hour += 12
                elif end_ampm == 'am' and end_hour == 12:
                    end_hour = 0

                # Create end_time as naive datetime first
                naive_end_time = datetime.combine(today, datetime.min.time().replace(
                    hour=end_hour,
                    minute=end_minute
                ))
                
                # Make timezone aware
                end_time = make_aware(naive_end_time)
            else:
                # Default to 1 hour duration
                end_time = start_time + timedelta(hours=1)

            # Create the event
            event = CalendarEvent.objects.create(
                user=user,
                title=title,
                description=f"Event created via AI Assistant on {now.strftime('%Y-%m-%d %H:%M:%S')}",
                start_time=start_time,
                end_time=end_time
            )

            request.session['last_created_event_id'] = event.id

            # Add default category
            default_category, _ = Category.objects.get_or_create(
                name="General",
                defaults={'color': "#5ac8fa"}
            )
            EventCategory.objects.create(event=event, category=default_category)

            # Format response using event's stored times to confirm correct storage
            return (
                f"✅ Event '{title}' scheduled!\n"
                f"📅 Time: {event.start_time.strftime('%I:%M %p')} - {event.end_time.strftime('%I:%M %p')}\n"
                f"Would you like me to set a reminder for this event?"
            )

        except Exception as e:
            logger.error(f"Error creating event: {e}")
            return "Sorry, I couldn't create the event. Please try again."
        
    def normalize_time_string(raw_time):
        s = raw_time.strip().lower().replace(" ", "")
        if re.match(r"^\d{1,2}(am|pm)$", s):
            s = s[:-2] + ":00 " + s[-2:].upper()
        elif re.match(r"^\d{1,2}:\d{2}(am|pm)$", s):
            s = s[:-2] + " " + s[-2:].upper()
        return s

    def get_schedule_summary():
        today = timezone_now().date()
        events = CalendarEvent.objects.filter(
            user=request.user,
            start_time__date=today
        ).order_by('start_time')
        
        if not events:
            return "You have no events scheduled for today."
        
        events_list = [f"• {e.title} at {e.start_time.strftime('%I:%M %p')} - {e.end_time.strftime('%I:%M %p')}" for e in events]
        return "Today's schedule:\n" + "\n".join(events_list)
    
    try:
        if request.method != "POST":
            return JsonResponse({"error": "Invalid request method"}, status=400)

        data = json.loads(request.body)
        user_message = data.get("message", "").strip()

        yes_patterns = ['yes', 'yes please', 'sure', 'ok', 'okay', 'yeah', 'please do']
        if user_message.lower() in yes_patterns:
            last_event_id = request.session.get('last_created_event_id')
            if last_event_id:
                try:
                    event = CalendarEvent.objects.get(id=last_event_id, user=request.user)
                    reminder_time = event.start_time - timedelta(minutes=10)
                    Reminder.objects.create(
                        user=request.user,
                        event=event,
                        reminder_time=reminder_time
                    )
                    del request.session['last_created_event_id']
                    response = f"🔔 Reminder set for **'{event.title}'** at **{reminder_time.strftime('%I:%M %p')}**."
                    ChatMessage.objects.create(
                        user=request.user,
                        role='assistant',
                        content=response,
                        timestamp=timezone_now()
                    ) 
                    return JsonResponse({"response": response})     
                except CalendarEvent.DoesNotExist:
                    pass

        if not user_message:
            return JsonResponse({"error": "Empty message"}, status=400)

        # Parse intent and handle accordingly
        intent = parse_intent(user_message)
        if intent:
            action, category, details = intent

            if action == 'event':
                if category == 'create':
                    if not details.get('title'):
                        response = "What event would you like to schedule?"
                    else:
                        response = create_event(
                            request,
                            request.user,
                            details['title'],
                            details.get('time'),
                            details.get('original_text')
                        )
                elif category == 'rename':
                    old = details['old_title']
                    new = details['new_title']
                    # Find today's event
                    event = CalendarEvent.objects.filter(
                        user=request.user, 
                        title__iexact=old,
                        start_time__date=timezone_now().date()
                    ).first()
                    
                    if event:
                        old_title = event.title
                        event.title = new
                        event.save()
                        response = f"✏️ Event renamed from '{old_title}' to '{new}'."
                    else:
                        response = f"❌ Couldn't find an event titled '{old}' for today."

                elif category == 'reschedule':
                    raw_title = details['title']
                    title = re.sub(r"^(event|meeting|session|activity)?\s*(for|about|called)?\s*", "", raw_title, flags=re.IGNORECASE).strip().capitalize()
                    new_time_str = details['new_time']
                    has_end_time = details.get('has_end_time', False)
                    
                    event = CalendarEvent.objects.filter(
                        user=request.user, 
                        title__iexact=title,
                        start_time__date=timezone_now().date()
                    ).first()
                    
                    if event:
                        try:
                            today = timezone_now().date()
                            
                            if has_end_time:
                                # Parse time range
                                time_pattern = re.compile(r"""
                                    (\d{1,2})(?::(\d{2}))?\s*(am|pm)
                                    \s+to\s+
                                    (\d{1,2})(?::(\d{2}))?\s*(am|pm)
                                """, re.IGNORECASE | re.VERBOSE)
                                
                                match = time_pattern.search(new_time_str)
                                if match:
                                    # Parse start time
                                    start_hour = int(match.group(1))
                                    start_minute = int(match.group(2) or 0)
                                    start_ampm = match.group(3).lower()

                                    if start_ampm == 'pm' and start_hour != 12:
                                        start_hour += 12
                                    elif start_ampm == 'am' and start_hour == 12:
                                        start_hour = 0

                                    # Parse end time
                                    end_hour = int(match.group(4))
                                    end_minute = int(match.group(5) or 0)
                                    end_ampm = match.group(6).lower()

                                    if end_ampm == 'pm' and end_hour != 12:
                                        end_hour += 12
                                    elif end_ampm == 'am' and end_hour == 12:
                                        end_hour = 0

                                    # Create new start and end times
                                    naive_start_time = datetime.combine(
                                        today,
                                        datetime.min.time().replace(hour=start_hour, minute=start_minute)
                                    )
                                    naive_end_time = datetime.combine(
                                        today,
                                        datetime.min.time().replace(hour=end_hour, minute=end_minute)
                                    )
                                    
                                    event.start_time = make_aware(naive_start_time)
                                    event.end_time = make_aware(naive_end_time)
                            else:
                                # Handle single time update
                                if ':' not in new_time_str:
                                    new_time_str = f"{new_time_str}:00"
                                if 'am' not in new_time_str.lower() and 'pm' not in new_time_str.lower():
                                    current_hour = int(new_time_str.split(':')[0])
                                    if current_hour < 8 or current_hour == 12:
                                        new_time_str += " PM"
                                    else:
                                        new_time_str += " AM"
                                
                                parsed_time = datetime.strptime(new_time_str, "%I:%M %p").time()
                                event_duration = event.end_time - event.start_time
                                
                                naive_start_time = datetime.combine(today, parsed_time)
                                event.start_time = make_aware(naive_start_time)
                                event.end_time = event.start_time + event_duration
                            
                            event.save()
                            
                            response = (
                                f"⏰ Event '{title}' moved to {event.start_time.strftime('%I:%M %p')} - "
                                f"{event.end_time.strftime('%I:%M %p')}."
                            )
                        except ValueError as e:
                            logger.error(f"Error parsing time: {e}")
                            response = "❌ Couldn't parse time. Please use format like '4:30 PM to 5:30 PM' or '4:30 PM'."
                        except Exception as e:
                            logger.error(f"Error rescheduling event: {e}")
                            response = "❌ An error occurred while rescheduling the event."
                    else:
                        response = f"❌ Couldn't find an event titled '{title}' for today."

                elif category == 'delete':
                    raw_title = details['title']
                    if raw_title:
                        title = re.sub(r"\b(event|meeting|session|activity)\b", "", raw_title, flags=re.IGNORECASE).strip().capitalize()
                    else:
                        title = ''
                    if title:
                        event = CalendarEvent.objects.filter(
                        user=request.user, 
                        title__iexact=title,
                        start_time__date=timezone_now().date()
                    ).first()
                    
                    if event:
                        event_info = f"'{event.title}' at {event.start_time.strftime('%I:%M %p')} - {event.end_time.strftime('%I:%M %p')}"
                        event.delete()
                        response = f"🗑️ Event {event_info} has been deleted."
                    else:
                        response = f"❌ Couldn't find an event titled '{title}' for today."

            
            elif action == 'task':
                if category == 'create' and details.get('title'):
                    title = details['title']
                    due_date_str = details.get('due_date')
                    
                    try:
                        due_date = make_aware(datetime.strptime(due_date_str, "%Y-%m-%d %H:%M")) if due_date_str else timezone_now()
                    except Exception as e:
                        logger.warning(f"Invalid due date format. Defaulting to now. Error: {e}")
                        due_date = timezone_now()

                    task = Task.objects.create(
                        user=request.user,
                        title=title,
                        description="Task created via AI Assistant",
                        completed=False,
                        due_date=due_date
                    )
                    response = f"✅ Task '{task.title}' created for {due_date.strftime('%A, %B %d at %I:%M %p')}."
                else:
                    response = "❌ Invalid task details provided."


            elif action == 'reminder':
                if category == 'create' and details.get('title'):
                    title = details['title']
                    time_str = details.get('time')

                    if not time_str:
                        response = "⏰ Please include a time for the reminder, like 'add reminder to drink water at 4:30 PM'."
                    else:
                        try:
                            logger.info(f"Received reminder: '{title}' at '{time_str}'")
                            today = timezone_now().date()

                            time_str = time_str.strip().lower().replace(" ", "")
                            if re.match(r"^\d{1,2}(am|pm)$", time_str):
                                time_str = time_str[:-2] + ":00 " + time_str[-2:].upper()
                            elif re.match(r"^\d{1,2}:\d{2}(am|pm)$", time_str):
                                time_str = time_str[:-2] + " " + time_str[-2:].upper()

                            
                            parsed_time = datetime.strptime(time_str, "%I:%M %p")
                            reminder_time = make_aware(datetime.combine(today, parsed_time.time()))

                            reminder = Reminder.objects.create(
                                user=request.user,
                                custom_title=title,
                                reminder_time=reminder_time,
                                event=None
                            )
                            logger.info(f"✅ Reminder created: {reminder}")

                            response = f"🔔 Reminder for **'{title}'** set at **{reminder_time.strftime('%I:%M %p')}**."
                        except Exception as e:
                            logger.error(f"Reminder creation error: {e}")
                            response = "❌ I couldn’t understand the time. Try 'add reminder to take meds at 5 PM'."

                else:
                    response = "❌ Invalid reminder format. Please include a title and a time like 'add reminder to call mom at 6 PM'."
                

            elif action == 'wellness':
                today = timezone_now().date()
                wellness, _ = DailyWellness.objects.get_or_create(
                    user=request.user,
                    date=today,
                    defaults={
                        'water_intake': 0,
                        'movement_breaks': 0,
                        'healthy_meals': 0,
                        'water_goal': 8,
                        'breaks_goal': 3,
                        'meals_goal': 3
                    }
                )
                
                response = (
                    f"Today's Wellness Stats:\n"
                    f"💧 Water: {wellness.water_intake}/{wellness.water_goal} glasses\n"
                    f"🏃 Movement breaks: {wellness.movement_breaks}/{wellness.breaks_goal}\n"
                    f"🥗 Healthy meals: {wellness.healthy_meals}/{wellness.meals_goal}"
                )
            else:
                response = (
                    "I can help you manage your schedule and wellbeing. Try:\n"
                    "• 'Add exercise 8 PM to 9 PM'\n"
                    "• 'Update exercise to 6 PM to 7 PM'\n"
                    "• 'Rename meeting to team sync'\n"
                    "• 'Move lunch to 1:30 PM'\n"
                    "• 'Delete meeting'\n"
                    "• 'Show my schedule'\n"
                    "• 'Create task'\n"
                    "• 'Check my wellness'"
                )

            ChatMessage.objects.create(
                user=request.user,
                role='assistant',
                content=response,
                timestamp=timezone_now()
            )
            return JsonResponse({"response": response})

        # Default to OpenAI for general conversation
        system_prompt = (
            "You're an AI assistant helping with scheduling and wellbeing. Current context:\n"
            f"- User: {request.user.username}\n"
            f"- Time: {timezone_now().strftime('%I:%M %p')}\n"
            f"- Date: {timezone_now().strftime('%B %d, %Y')}\n\n"
            "You can:\n"
            "1. Create events (e.g., 'Add exercise 8 PM to 9 PM')\n"
            "2. Update events (e.g., 'Update exercise to 6 PM to 7 PM')\n"
            "3. Rename events (e.g., 'Rename meeting to team sync')\n"
            "4. Move events (e.g., 'Move lunch to 1:30 PM')\n"
            "5. Delete events (e.g., 'Delete meeting')\n"
            "6. Show schedule (e.g., 'What's on today?')\n"
            "7. Create tasks\n"
            "8. Check wellness stats\n"
            "Be concise and friendly in your responses."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages,
            max_tokens=150,
            temperature=0.7
        )
        
        bot_reply = response["choices"][0]["message"]["content"].strip()
        intent_after_gpt = parse_intent(bot_reply)
        if intent_after_gpt:
            action, category, details = intent_after_gpt

            if action == 'reminder' and category == 'create':
                try:
                    title = details['title']
                    time_str = details['time']

                    if title and time_str:
                        today = timezone_now().date()

                        time_str = time_str.strip().lower().replace(" ", "")
                        if re.match(r"^\d{1,2}(am|pm)$", time_str):
                            time_str = time_str[:-2] + ":00 " + time_str[-2:].upper()
                        elif re.match(r"^\d{1,2}:\d{2}(am|pm)$", time_str):
                            time_str = time_str[:-2] + " " + time_str[-2:].upper()

                        parsed_time = datetime.strptime(time_str, "%I:%M %p")
                        reminder_time = make_aware(datetime.combine(today, parsed_time.time()))

                        Reminder.objects.create(
                            user=request.user,
                            custom_title=title,
                            reminder_time=reminder_time,
                            event=None
                        )
                        logger.info(f"✅ Reminder created after GPT fallback: {title} at {reminder_time}")
                except Exception as e:
                    logger.error(f"❌ Failed to create reminder after GPT fallback: {e}")


        ChatMessage.objects.create(
            user=request.user,
            role='assistant',
            content=bot_reply,
            timestamp=timezone_now()
        )
        
        return JsonResponse({"response": bot_reply})

               
    except Exception as e:
        logger.error(f"Error in chatbot logic: {str(e)}")
        return JsonResponse(
            {"error": "Sorry, I encountered an error. Please try again."},
            status=500
        )
    