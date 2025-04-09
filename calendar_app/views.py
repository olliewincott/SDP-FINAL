from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
import json
import openai
from django.conf import settings
from .models import CalendarEvent, Reminder, Category, EventCategory, Task, DailyWellness, MoodEntry, Category
from datetime import datetime, timedelta, date
import re
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.db.models import Avg
from django.contrib.auth.forms import UserCreationForm
from django.utils import timezone
from django.utils.timezone import localtime
from django.utils.timezone import now as timezone_now, make_aware, is_naive



# Set the OpenAI API key from settings (loaded from your .env file)
openai.api_key = settings.OPENAI_API_KEY

# -----------------------------
# FullCalendar Integration Views
# -----------------------------

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
        reminder__isnull=False  # Exclude events that have associated reminders
    ).order_by("start_time")

    event_list = []
    for event in events:
        event_list.append({
            "id": event.id,
            "title": event.title,
            "start": event.start_time.isoformat(),
            "end": event.end_time.isoformat(),
            "description": event.description,
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
        event__user=request.user,
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

@csrf_exempt
@login_required
def chatbot_response(request):
    """
    Handles chatbot interactions using OpenAI's ChatCompletion API.
    It attempts to parse the assistant's response as JSON and create an event.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_message = data.get("message", "").strip()
            conversation_history = data.get("history", [])

            if not user_message:
                return JsonResponse({"error": "Empty message."}, status=400)
            if not openai.api_key:
                return JsonResponse({"error": "OpenAI API Key is missing."}, status=400)

            system_message = (
                "Hello! Let's set up your weekly schedule step-by-step. "
                "When you have all the necessary event details (title, date, start_time, end_time, and user_id), "
                "please output ONLY a JSON object in the exact format below with no extra text:\n\n"
                "{\n"
                '  "title": "Event Title",\n'
                '  "date": "YYYY-MM-DD",\n'
                '  "start_time": "HH:MM AM/PM",\n'
                '  "end_time": "HH:MM AM/PM",\n'
                '  "user_id": "testuser",\n'
                '  "description": "Event Description",\n'
                '  "reminder": "HH:MM AM/PM"\n'
                "}\n\n"
                "If any detail is missing, ask follow-up questions without adding extra commentary."
            )

            messages = [{"role": "system", "content": system_message}]
            if conversation_history:
                messages.extend(conversation_history)
            messages.append({"role": "user", "content": user_message})

            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=messages,
                max_tokens=250,
                temperature=0.7
            )

            bot_response = response["choices"][0]["message"]["content"].strip()
            conversation_history.append({"role": "user", "content": user_message})
            conversation_history.append({"role": "assistant", "content": bot_response})

            print("Bot response:", bot_response)

            json_match = re.search(r'\{.*\}', bot_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                try:
                    event_details = json.loads(json_str)
                    event = create_event_from_details(event_details)
                    bot_response += f"\nEvent '{event.title}' was successfully added to your schedule."
                except Exception as e:
                    print("Error creating event:", e)
                    bot_response += f"\n(Note: Unable to create event from the provided details: {e})"
            else:
                print("No valid JSON found in bot response; continuing conversation.")

            return JsonResponse({"response": bot_response, "history": conversation_history})

        except openai.OpenAIError as e:
            print("OpenAI API Error:", str(e))
            return JsonResponse({"error": f"OpenAI API Error: {str(e)}"}, status=500)
        except Exception as e:
            print("Server Error:", str(e))
            return JsonResponse({"error": f"Server Error: {str(e)}"}, status=500)

    return JsonResponse({"error": "Invalid request method."}, status=400)

@csrf_exempt
@login_required
def add_event(request):
    if request.method == "POST":
        try:
            print("✅ Incoming POST request to add_event")
            print("✅ Request data:", request.POST)

            title = request.POST.get("title")
            description = request.POST.get("description")
            start_time = request.POST.get("start_time")
            end_time = request.POST.get("end_time")
            user_id = request.POST.get("user_id")
            add_reminder = request.POST.get("add_reminder")
            reminder_time = request.POST.get("reminder_time", None)

            category_option = request.POST.get("category_option")
            category_id = request.POST.get("category_id")
            new_category_name = request.POST.get("new_category_name")

            if not title or not start_time or not end_time or not user_id:
                return JsonResponse({"error": "All fields are required."}, status=400)

            user = get_object_or_404(User, id=user_id)

            event = CalendarEvent.objects.create(
                title=title, description=description,
                start_time=start_time, end_time=end_time, user=user
            )
            print(f"✅ Created event: {event.title}")

            if category_option == "new" and new_category_name:
                category = Category.objects.create(name=new_category_name)
            else:
                category = get_object_or_404(Category, id=category_id)

            EventCategory.objects.create(event=event, category=category)
            print(f"✅ Assigned category: {category.name}")

            if add_reminder == "yes" and reminder_time:
                Reminder.objects.create(event=event, reminder_time=reminder_time)
                print(f"✅ Reminder added for {event.title} at {reminder_time}")

            return JsonResponse({"success": "Event added successfully!"})

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

    try:
        wellness = DailyWellness.objects.get(user=user, date=today)
        data = {
            "water_intake": wellness.water_intake,
            "movement_breaks": wellness.movement_breaks,
            "healthy_meals": wellness.healthy_meals
        }
    except DailyWellness.DoesNotExist:
        data = {
            "water_intake": 0,
            "movement_breaks": 0,
            "healthy_meals": 0
        }

    return JsonResponse(data)

@login_required
def increment_wellness(request):
    from django.http import JsonResponse
    from datetime import date

    user = request.user
    today = date.today()
    stat_type = request.POST.get('type')

    if stat_type not in ['water', 'breaks', 'meals']:
        return JsonResponse({'error': 'Invalid stat type'}, status=400)

    wellness, _ = DailyWellness.objects.get_or_create(user=user, date=today)

    if stat_type == 'water':
        wellness.water_intake += 1
    elif stat_type == 'breaks':
        wellness.movement_breaks += 1
    elif stat_type == 'meals':
        wellness.healthy_meals += 1

    wellness.save()

    # Send updated stats back
    return JsonResponse({
        'water_intake': wellness.water_intake,
        'movement_breaks': wellness.movement_breaks,
        'healthy_meals': wellness.healthy_meals
    })

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
    return render(request, 'calendar.html')

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
def create_mood_entry(request):
    if request.method == 'POST':
        mood_rating = request.POST.get('mood_rating')
        note = request.POST.get('note', '')
        # Create the MoodEntry record for the logged-in user
        MoodEntry.objects.create(
            user=request.user,
            mood_rating=mood_rating,
            note=note
        )
        return redirect('dashboard')  # Adjust as needed
    return render(request, 'mood_tracker.html')

@login_required
def ai_assistant_view(request):
    return render(request, 'ai_assistant.html')

@login_required
def wellbeing_view(request):
    # Optionally fetch any data you'd like to display
    reminders = Reminder.objects.filter(user=request.user) if request.user.is_authenticated else []
    
    return render(request, 'wellbeing.html', {
        'reminders': reminders,
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
