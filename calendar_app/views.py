from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
import json
import openai
from django.conf import settings
from .models import CalendarEvent, Reminder, Category, EventCategory, Task, DailyWellness, MoodEntry, Category, DailyWellness, ChatMessage
from datetime import datetime, timedelta, date
import re
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.db.models import Avg
from django.contrib.auth.forms import UserCreationForm
from django.utils import timezone
from django.utils.timezone import localtime
from django.utils.timezone import now as timezone_now, make_aware, is_naive
from django.utils.dateparse import parse_datetime as django_parse_datetime
from django.db import transaction, OperationalError
import time
import difflib
from django.utils.timezone import now
from django.utils.html import escape
from .chatbot.chatbot_response import chatbot_response_logic   # import the chatbot logic

# Set the OpenAI API key from settings (loaded from your .env file)
openai.api_key = settings.OPENAI_API_KEY

# -----------------------------
# FullCalendar Integration Views
# -----------------------------

def calculate_streak(user):
    today = date.today()
    streak = 0

    for i in range(0, 100):  # Check up to 100 days back
        day = today - timedelta(days=i)
        try:
            wellness = DailyWellness.objects.get(user=user, date=day)
            if wellness.goal_completed:
                streak += 1
            else:
                break
        except DailyWellness.DoesNotExist:
            break

    return streak

@login_required
def fullcalendar_view(request):
    """
    Renders the FullCalendar timetable.
    Create a template named 'fullcalendar.html' in your templates folder.
    """
    return render(request, 'fullcalendar.html')

@login_required
def events_json(request):
    events = CalendarEvent.objects.filter(
        user=request.user
    ).exclude(
        reminder__isnull=False  # Exclude events that are reminders
    ).order_by("start_time")

    event_list = []
    for event in events:
        # Grab the first associated category from the EventCategory model
        event_category = EventCategory.objects.filter(event=event).select_related('category').first()
        color = event_category.category.color if event_category and event_category.category else '#5ac8fa'
        category_id = event_category.category.id if event_category and event_category.category else None

        event_list.append({
            "id": event.id,
            "title": event.title,
            "start": event.start_time.isoformat(),
            "end": event.end_time.isoformat(),
            "description": event.description,
            "backgroundColor": color,
            "category_id": category_id,  # ✅ Added here
        })

    return JsonResponse(event_list, safe=False)
# -----------------------------
# Other Existing Views
# -----------------------------

def index(request):
    return render(request, 'index.html')

@login_required
def dashboard(request):
    now = timezone_now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = now.replace(hour=23, minute=59, second=59)

    if is_naive(start_of_day):
        start_of_day = make_aware(start_of_day)
    if is_naive(end_of_day):
        end_of_day = make_aware(end_of_day)

    reminders = Reminder.objects.filter(
        user=request.user,
        reminder_time__range=(start_of_day, end_of_day)
    ).order_by('reminder_time')

    # ✅ Query all categories to use in dropdown
    categories = Category.objects.all()

    return render(request, 'dashboard.html', {
        'reminders': reminders,
        'categories': categories  # 👈 Include in context
    })

@login_required
def help(request):
    return render(request, 'help.html')

@login_required
def chatbot(request):
    return render(request, 'chatbot.html')

@login_required
def db_test(request):
    return render(request, 'db_test.html', {
        # For testing, you might only want the current user's events/reminders:
        "users": User.objects.all(),  # This one is global; adjust if needed.
        "events": CalendarEvent.objects.filter(user=request.user),
        "categories": Category.objects.all(),  # Categories might be global.
        "reminders": Reminder.objects.filter(event__user=request.user)
    })

# (The following functions are kept for event creation via chatbot and manual event handling.)

def parse_datetime(date_str, time_str):
    """
    Converts a date string and a time string into a datetime object.
    Expected date format: "YYYY-MM-DD"
    Expected time format: "HH:MM AM/PM"
    """
    try:
        dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
        return dt
    except ValueError:
        raise Exception(f"Invalid date/time format: '{date_str} {time_str}'. Expected: 'YYYY-MM-DD HH:MM AM/PM'")

def create_event_from_details(details):
    """
    Creates an event using details provided in a dictionary.
    Expected keys: 'title', 'date', 'start_time', 'end_time', and 'user_id'
    Optional keys: 'description' and 'reminder' (reminder time as "HH:MM AM/PM").
    """
    title = details.get("title")
    date_str = details.get("date")
    start_time_str = details.get("start_time")
    end_time_str = details.get("end_time")
    user_identifier = details.get("user_id")
    description = details.get("description", "")
    reminder_str = details.get("reminder", "")

    if not title or not date_str or not start_time_str or not end_time_str or not user_identifier:
        raise Exception("Missing event details. Provide title, date, start_time, end_time, and user_id.")
    
    start_time = parse_datetime(date_str, start_time_str)
    end_time = parse_datetime(date_str, end_time_str)
    
    if end_time <= start_time:
        raise Exception("End time must be after start time.")
    
    # Ensure the event is created for the correct user.
    try:
        user_id = int(user_identifier)
        user = get_object_or_404(User, id=user_id)
    except ValueError:
        user = get_object_or_404(User, username=user_identifier)
    
    event = CalendarEvent.objects.create(
        title=title,
        start_time=start_time,
        end_time=end_time,
        user=user,
        description=description
    )
    
    if reminder_str:
        try:
            reminder_time = parse_datetime(date_str, reminder_str)
            Reminder.objects.create(event=event, reminder_time=reminder_time)
        except Exception as e:
            print("Reminder creation error:", e)
    
    return event

from .models import ChatMessage  # Make sure this is imported!

@csrf_exempt
@login_required
def chatbot_response(request):
    return chatbot_response_logic(request)

@csrf_exempt
@login_required
def add_event(request):
    if request.method == "POST":
        try:
            print("✅ Incoming POST request to add_event")
            print("✅ Request data:", request.POST)

            for _ in range(3):  # retry 3 times if locked
                try:
                    with transaction.atomic():
                        event_id = request.POST.get("id")
                        title = request.POST.get("title")
                        description = request.POST.get("description")
                        start_time_raw = request.POST.get("start_time")
                        end_time_raw = request.POST.get("end_time")
                        user_id = request.POST.get("user_id")
                        add_reminder = request.POST.get("add_reminder")
                        reminder_time = request.POST.get("reminder_time", None)

                        category_option = request.POST.get("category_option")
                        category_id = request.POST.get("category_id")
                        new_category_name = request.POST.get("new_category_name")

                        if not title or not start_time_raw or not end_time_raw or not user_id:
                            return JsonResponse({"error": "All fields are required."}, status=400)

                        start_time = make_aware(datetime.fromisoformat(start_time_raw))
                        end_time = make_aware(datetime.fromisoformat(end_time_raw))

                        user = get_object_or_404(User, id=user_id)

                        if event_id:
                            event = get_object_or_404(CalendarEvent.objects.select_for_update(), id=event_id)
                            event.title = title
                            event.description = description
                            event.start_time = start_time
                            event.end_time = end_time
                            event.user = user
                            event.save()
                            EventCategory.objects.filter(event=event).delete()
                        else:
                            event = CalendarEvent.objects.create(
                                title=title, description=description,
                                start_time=start_time, end_time=end_time, user=user
                            )

                        print(f"✅ Event processed: {event.title}")

                        if category_option == "new" and new_category_name:
                            category = Category.objects.create(name=new_category_name)
                        else:
                            category = get_object_or_404(Category, id=category_id)

                        EventCategory.objects.create(event=event, category=category)
                        print(f"✅ Assigned category: {category.name}")

                        if add_reminder == "yes" and reminder_time:
                            Reminder.objects.update_or_create(event=event, defaults={"reminder_time": reminder_time})
                            print(f"✅ Reminder updated/created for {event.title} at {reminder_time}")

                        return JsonResponse({"success": "Event saved successfully!"})

                except OperationalError as e:
                    if "database is locked" in str(e):
                        print("🔁 Retrying after DB lock...")
                        time.sleep(0.2)
                        continue
                    raise

        except Exception as e:
            print("❌ Error:", str(e))
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request"}, status=400)

@csrf_exempt
@login_required
def delete_event(request, event_id):
    try:
        event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)
        event.delete()
        return JsonResponse({"success": "Event deleted successfully!"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@login_required
def all_tasks_json(request):
    """
    Returns all tasks as a JSON response for the logged-in user.
    """
    tasks = Task.objects.filter(user=request.user).order_by('due_date')
    tasks_list = [
        {
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'completed': task.completed,
            'due_date': task.due_date.isoformat() if task.due_date else None
        }
        for task in tasks
    ]
    return JsonResponse(tasks_list, safe=False)

@csrf_exempt
@login_required
def update_task_status(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            task_id = data.get("task_id")
            completed = data.get("completed")
            task = Task.objects.get(id=task_id, user=request.user)
            task.completed = completed
            task.save()
            return JsonResponse({"success": True, "task_id": task_id, "completed": task.completed})
        except Task.DoesNotExist:
            return JsonResponse({"error": "Task not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    return JsonResponse({"error": "Invalid request method"}, status=400)

@login_required
def daily_wellness_json(request):
    """Return the logged-in user's DailyWellness for today as JSON."""
    today = date.today()
    user = request.user

    wellness, _ = DailyWellness.objects.get_or_create(user=user, date=today)

    data = {
        "water_intake": wellness.water_intake,
        "movement_breaks": wellness.movement_breaks,
        "healthy_meals": wellness.healthy_meals,
        "water_goal": wellness.water_goal,
        "breaks_goal": wellness.breaks_goal,
        "meals_goal": wellness.meals_goal,
        "xp": getattr(wellness, "xp", 0),
        "level": getattr(wellness, "level", 1)
    }

    return JsonResponse(data)


@csrf_exempt
@login_required
def increment_wellness(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        metric = data.get("metric")  # should be 'water', 'breaks', or 'meals'
        user = request.user
        today = date.today()

        # Validate metric
        if metric not in ['water', 'breaks', 'meals']:
            return JsonResponse({"error": "Invalid metric."}, status=400)

        # Map incoming metric to model fields
        metric_fields = {
            "water": "water_intake",
            "breaks": "movement_breaks",
            "meals": "healthy_meals"
        }

        field_name = metric_fields[metric]

        # Get or create today's wellness record
        wellness, _ = DailyWellness.objects.get_or_create(user=user, date=today)

        # Increment the metric value
        setattr(wellness, field_name, getattr(wellness, field_name) + 1)

        # Handle XP and leveling
        xp_gained = 10
        xp_threshold = 100
        leveled_up = False

        if not hasattr(wellness, "xp"):
            wellness.xp = 0
        if not hasattr(wellness, "level"):
            wellness.level = 1

        wellness.xp += xp_gained
        while wellness.xp >= xp_threshold:
            wellness.xp -= xp_threshold
            wellness.level += 1
            leveled_up = True

        # Update goal_completed if all goals met
        if wellness.has_met_goals():
            wellness.goal_completed = True

        wellness.save()

        # Calculate streak
        streak = 0
        streak_date = today

        while True:
            try:
                entry = DailyWellness.objects.get(user=user, date=streak_date)
                if not entry.goal_completed:
                    break
                streak += 1
                streak_date -= timedelta(days=1)
            except DailyWellness.DoesNotExist:
                break

        return JsonResponse({
            "success": True,
            "new_value": getattr(wellness, field_name),
            "xp": wellness.xp,
            "level": wellness.level,
            "leveled_up": leveled_up,
            "streak": streak
        })

    return JsonResponse({"error": "Invalid request method."}, status=400)

@login_required
def monthly_productivity_json(request):
    user = request.user
    today = date.today()
    data = []

    for day_offset in range(29, -1, -1):  # Past 30 days
        target_date = today - timedelta(days=day_offset)
        completed_tasks = Task.objects.filter(
            completed=True,
            due_date__date=target_date,
            user=user  # Now filtering by logged-in user
        ).count()
        data.append({
            "date": target_date.strftime("%b %d"),
            "count": completed_tasks
        })

    return JsonResponse(data, safe=False)

@login_required
def monthly_wellness_json(request):
    # Only get DailyWellness records for the logged-in user
    qs = DailyWellness.objects.filter(user=request.user)
    
    monthly_data = qs.values('date__month').annotate(
        avg_water=Avg('water_intake'),
        avg_breaks=Avg('movement_breaks'),
        avg_meals=Avg('healthy_meals')
    ).order_by('date__month')

    data = []
    for entry in monthly_data:
        data.append({
            'month': entry['date__month'],
            'avg_water': float(entry['avg_water']) if entry['avg_water'] is not None else 0,
            'avg_breaks': float(entry['avg_breaks']) if entry['avg_breaks'] is not None else 0,
            'avg_meals': float(entry['avg_meals']) if entry['avg_meals'] is not None else 0,
            'target_water': 8,
            'target_breaks': 3,
            'target_meals': 3,
        })

    return JsonResponse(data, safe=False)

@login_required
def analytics_view(request):
    return render(request, 'analytics.html')

@login_required
def tasks_view(request):
    return render(request, 'tasks.html')

@login_required
def calendar_view(request):
    categories = Category.objects.all()
    return render(request, 'calendar.html', {
        'categories': categories
    })

def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            print("User created:", user.username)
            return redirect('login')
        else:
            print("Registration form errors:", form.errors)
    else:
        form = UserCreationForm()
    return render(request, 'register.html', {'form': form})

@login_required
@csrf_exempt
def create_mood_entry(request):
    if request.method == 'POST':
        mood_rating = request.POST.get('mood_rating')
        note = request.POST.get('note', '')

        MoodEntry.objects.create(
            user=request.user,
            mood_rating=mood_rating,
            note=note
        )

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': True})
        return redirect('wellbeing')  # fallback for non-AJAX

    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)

@login_required
def ai_assistant_view(request):
    return render(request, 'includes/ai/ai_assistant.html')

@login_required
def wellbeing_view(request):
    reminders = Reminder.objects.filter(user=request.user)

    # Get or create today's wellness record
    wellness, created = DailyWellness.objects.get_or_create(
        user=request.user,
        date=date.today()
    )

    # Calculate correct streak
    today = now().date()
    yesterday = today - timedelta(days=1)

    # Fetch all user entries ordered from most recent
    wellness_entries = DailyWellness.objects.filter(user=request.user).order_by('-date')

    streak = 0
    skipped_today = False

    for entry in wellness_entries:
        if entry.date == today:
            if entry.goal_completed:
                streak += 1
            else:
                skipped_today = True
                continue  # Don't break yet — check yesterday
        elif entry.date == yesterday:
            if entry.goal_completed:
                streak += 1
            else:
                break
        elif entry.goal_completed:
            streak += 1
        else:
            break

    return render(request, 'wellbeing.html', {
        'reminders': reminders,
        'wellness': wellness,
        'wellness_streak': streak
    })
@login_required
@csrf_exempt
def update_event_time(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            event = CalendarEvent.objects.get(id=data['id'])
            event.start_time = data['start']
            if data.get('end'):
                event.end_time = data['end']
            event.save()
            return JsonResponse({'success': True})
        except Exception as e:
            print("Update error:", e)
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False})

@csrf_exempt
@login_required
def add_task(request):
    if request.method == "POST":
        title = request.POST.get('title')
        description = request.POST.get('description', '')
        due_date = request.POST.get('due_date')

        if not title or not due_date:
            return JsonResponse({'success': False, 'error': 'Title and due date are required.'})

        try:
            parsed_due_date = django_parse_datetime(due_date)
            task = Task.objects.create(
                user=request.user,
                title=title,
                description=description,
                due_date=parsed_due_date
            )
            return JsonResponse({
                'success': True,
                'task': {
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'due_date': task.due_date.isoformat()
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@csrf_exempt
@login_required
def add_reminder(request):
    if request.method == "POST":
        event_id = request.POST.get('event_id')
        reminder_time = request.POST.get('reminder_time')

        if not event_id or not reminder_time:
            return JsonResponse({'success': False, 'error': 'Event and time are required.'})

        try:
            event = CalendarEvent.objects.get(id=event_id, user=request.user)
        except CalendarEvent.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Event not found.'})

        try:
            parsed_time = django_parse_datetime(reminder_time)

            # Ensure datetime is timezone-aware if it's naive
            if parsed_time and is_naive(parsed_time):
                parsed_time = make_aware(parsed_time)

            reminder = Reminder.objects.create(
                user=request.user,
                event=event,
                reminder_time=parsed_time
            )

            return JsonResponse({
                'success': True,
                'reminder': {
                    'id': reminder.id,
                    'title': event.title,
                    'reminder_time': reminder.reminder_time.isoformat()
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@login_required
@csrf_exempt
def update_event_time(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            event = CalendarEvent.objects.get(id=data['id'])
            event.start_time = data['start']
            if data.get('end'):
                event.end_time = data['end']
            event.save()
            return JsonResponse({'success': True})
        except Exception as e:
            print("Update error:", e)
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False})

@require_POST
@login_required
def toggle_reminder(request, reminder_id):
    try:
        reminder = Reminder.objects.get(id=reminder_id, user=request.user)
        reminder.dismissed = not reminder.dismissed
        reminder.save()
        return JsonResponse({"success": True, "dismissed": reminder.dismissed})
    except Reminder.DoesNotExist:
        return JsonResponse({"success": False, "error": "Reminder not found"})


@csrf_exempt
@login_required
def delete_reminder(request, reminder_id):
    if request.method == "POST":
        try:
            reminder = Reminder.objects.get(id=reminder_id, user=request.user)
            reminder.delete()
            return JsonResponse({'success': True})
        except Reminder.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Reminder not found'})
    return JsonResponse({'success': False, 'error': 'Invalid request'})

@csrf_exempt
@login_required
def edit_reminder(request, reminder_id):
    try:
        reminder = Reminder.objects.get(pk=reminder_id)
    except Reminder.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Reminder not found'}, status=404)
    
    # Update the event field using the posted event_id.
    event_id = request.POST.get('event_id')
    if event_id:
        try:
            reminder.event_id = int(event_id)
        except ValueError:
            return JsonResponse({'success': False, 'error': 'Invalid event id'}, status=400)
    
    # Update the reminder_time field.
    reminder_time_str = request.POST.get('reminder_time')
    if reminder_time_str:
        try:
            # Parse the ISO formatted string to a naive datetime.
            naive_dt = datetime.fromisoformat(reminder_time_str)
            # Convert to an aware datetime using the default timezone.
            reminder.reminder_time = timezone.make_aware(naive_dt)
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'Invalid reminder time: {str(e)}'}, status=400)
    
    try:
        reminder.save()
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({
        'success': True,
        'reminder': {
            'id': reminder.id,
            'event_id': reminder.event_id,
            'reminder_time': reminder.reminder_time.isoformat()
        }
    })

@csrf_exempt
@login_required
def delete_task(request, task_id):
    if request.method == "POST":
        try:
            task = Task.objects.get(id=task_id, user=request.user)
            task.delete()
            return JsonResponse({'success': True})
        except Task.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Task not found.'})
    return JsonResponse({'success': False, 'error': 'Invalid request method.'})

@csrf_exempt
@login_required
def edit_task(request, task_id):
    try:
        task = Task.objects.get(pk=task_id)
    except Task.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Task not found'}, status=404)
    
    # Update task fields. Make sure the form names match the model field names.
    task.title = request.POST.get('title', task.title)
    task.description = request.POST.get('description', task.description)
    
    # If you expect the date as an ISO formatted string, parse it into a Python datetime.
    due_date = request.POST.get('due_date')
    if due_date:
        from datetime import datetime
        try:
            task.due_date = datetime.fromisoformat(due_date)
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'Invalid due date: {str(e)}'}, status=400)

    try:
        task.save()
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

    # Return the updated task data
    return JsonResponse({
        'success': True,
        'task': {
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
        }
    })

@csrf_exempt
@login_required
def update_wellness_goals(request):
    if request.method == "POST":
        print("✅ Received POST to update_wellness_goals")
        print("👉 POST data:", request.POST)

        user = request.user
        today = date.today()
        water_goal = request.POST.get("water_goal")
        breaks_goal = request.POST.get("breaks_goal")
        meals_goal = request.POST.get("meals_goal")

        wellness, created = DailyWellness.objects.get_or_create(user=user, date=today)

        if water_goal is not None:
            wellness.water_goal = int(water_goal)
        if breaks_goal is not None:
            wellness.breaks_goal = int(breaks_goal)
        if meals_goal is not None:
            wellness.meals_goal = int(meals_goal)

        wellness.save()
        return JsonResponse({"success": True, "message": "Goals updated!"})

    return JsonResponse({"success": False, "error": "Invalid request"}, status=400)


@login_required
def get_chat_history(request):
    messages = ChatMessage.objects.filter(user=request.user).order_by('timestamp')
    history = [
        {
            "role": msg.role,
            "content": msg.content
        }
        for msg in messages
    ]
    return JsonResponse({"history": history})

@csrf_exempt
@login_required
def clear_chat_history(request):
    if request.method == 'POST':
        ChatMessage.objects.filter(user=request.user).delete()
        return JsonResponse({"success": True})
    return JsonResponse({"error": "Invalid request."}, status=400)