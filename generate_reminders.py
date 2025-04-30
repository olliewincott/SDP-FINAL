import os
import django
import random
from datetime import datetime, timedelta, time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdproject.settings')  # <- CHANGE THIS
django.setup()

from django.utils import timezone
from django.contrib.auth.models import User
from calendar_app.models import CalendarEvent, Reminder  # Adjust if app name differs

# Get the user
user = User.objects.get(username='Oliver_Wincott')

# Define some realistic titles
reminder_titles = [
    "Dentist Appointment",
    "Team Sync Meeting",
    "Take medication",
    "Yoga class",
    "Client call",
    "Pick up groceries",
    "Water the plants",
    "Doctor follow-up",
    "Call with Mum",
    "Submit expense report",
    "Laundry reminder",
    "Stretch break",
    "Journal for 10 minutes",
    "Deadline check-in",
    "Evening walk"
]

start_date = datetime.today().date()
num_days = 14  # Next 2 weeks

for day_offset in range(num_days):
    current_date = start_date + timedelta(days=day_offset)

    for _ in range(3):  # 3 reminders per day
        title = random.choice(reminder_titles)
        hour = random.randint(7, 20)
        minute = random.choice([0, 15, 30, 45])
        reminder_dt_naive = datetime.combine(current_date, time(hour, minute))
        reminder_dt = timezone.make_aware(reminder_dt_naive)

        # Create a matching event (or reuse logic can be added if needed)
        event = CalendarEvent.objects.create(
            user=user,
            title=title,
            description=f"Auto-generated for {title}",
            start_time=reminder_dt,
            end_time=reminder_dt + timedelta(minutes=30),
        )

        Reminder.objects.create(
            user=user,
            event=event,
            reminder_time=reminder_dt
        )

        print(f"Created reminder: {title} at {reminder_dt.strftime('%Y-%m-%d %H:%M')}")

print("✅ Finished creating reminder data.")
