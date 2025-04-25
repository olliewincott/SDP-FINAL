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
        text = text.lower()
        
        # Event Creation patterns
        event_patterns = [
            # Pattern for time range with 'to'
            r"(?:add|schedule|create)\s+[\"']?(.*?)[\"']?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
            # Basic event creation
            r"(?:create|add|schedule)\s+[\"']?(.*?)[\"']?\s+(?:at|from)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
            # Natural language patterns
            r"(?:let's|can\syou|please)\s+(?:schedule|add)\s+[\"']?(.*?)[\"']?\s+(?:at|from)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))"
        ]

        # Event rename
        rename_match = re.match(r"(rename|change)\s+(event|meeting)?\s*[\"']?(.*?)[\"']?\s+to\s+[\"']?(.*?)[\"']?$", text)
        if rename_match:
            old_title = rename_match.group(3).strip()
            new_title = rename_match.group(4).strip()
            return ('event', 'rename', {'old_title': old_title, 'new_title': new_title})

        # Event move/reschedule with time range
        move_range_match = re.match(
            r"(?:move|reschedule|update)\s+(event|meeting)?\s*[\"']?(.*?)[\"']?\s+(?:to|at|from)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
            text
        )
        if move_range_match:
            title = move_range_match.group(2).strip()
            start_time = move_range_match.group(3).strip()
            end_time = move_range_match.group(4).strip()
            return ('event', 'reschedule', {
                'title': title,
                'new_time': f"{start_time} to {end_time}",
                'has_end_time': True
            })

        # Event move/reschedule single time
        move_match = re.match(
            r"(?:move|reschedule|update)\s+(event|meeting)?\s*[\"']?(.*?)[\"']?\s+(?:to|at)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))",
            text
        )
        if move_match:
            title = move_match.group(2).strip()
            time_str = move_match.group(3).strip()
            return ('event', 'reschedule', {
                'title': title,
                'new_time': time_str,
                'has_end_time': False
            })

        # Event delete
        delete_match = re.match(r"(delete|remove|cancel)\s+(event|meeting)?\s*[\"']?(.*?)[\"']?$", text)
        if delete_match:
            title = delete_match.group(3).strip()
            return ('event', 'delete', {'title': title})

        # Check for event creation patterns
        for pattern in event_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()
                title = groups[0].strip() if groups[0] else None
                
                # Handle time range pattern
                if len(groups) == 3:  # Pattern with start and end time
                    time_str = f"{groups[1]} to {groups[2]}"
                else:  # Pattern with single time
                    time_str = groups[1] if len(groups) > 1 else None

                return ('event', 'create', {
                    'title': title,
                    'time': time_str,
                    'original_text': text
                })

        # Check Schedule
        if any(phrase in text for phrase in ["schedule", "what do i have", "what's planned", "today"]):
            return ('schedule', 'view', None)

        # Task Creation
        task_match = re.match(r"(add|create)\s+task\s+(.*?)(?:\s+due\s+(.*)|$)", text)
        if task_match:
            _, title, due_date = task_match.groups()
            return ('task', 'create', {'title': title, 'due_date': due_date})

        # Wellness Check
        if "wellness" in text or "wellbeing" in text or "how am i doing" in text:
            return ('wellness', 'check', None)

        return None
    
    def create_event(user, title, time_str, original_text=None):
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
                    title = details['title']
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
                    title = details['title']
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

            elif action == 'schedule':
                response = get_schedule_summary()
            elif action == 'task':
                if category == 'create' and details.get('title'):
                    task = Task.objects.create(
                        user=request.user,
                        title=details['title'],
                        description="Task created via AI Assistant",
                        completed=False,
                        due_date=make_aware(datetime.strptime(details['due_date'], "%Y-%m-%d %H:%M")) if details.get('due_date') else None
                    )
                    response = f"✅ Task '{task.title}' created successfully!"
                else:
                    response = "❌ Invalid task details provided."
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
    