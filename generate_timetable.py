#!/usr/bin/env python
import os
import django
import random
from datetime import datetime, timedelta, time
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdproject.settings')
django.setup()

from django.contrib.auth.models import User
from calendar_app.models import CalendarEvent, Category, EventCategory

CATEGORY_COLORS = {
    "Lecture": "#3498db",
    "Seminar": "#8e44ad",
    "Study": "#2ecc71",
    "Part-Time Job": "#f39c12",
    "Exercise": "#27ae60",
    "Social": "#e74c3c",
    "Errands": "#16a085",
    "Commute": "#4b6cb7",
    "Rest": "#95a5a6",
}

TITLE_TO_CATEGORY = {
    "Morning Lecture": "Lecture",
    "Afternoon Lecture": "Lecture",
    "Seminar": "Seminar",
    "Group Study": "Study",
    "Solo Study": "Study",
    "Library Session": "Study",
    "Part-Time Job": "Part-Time Job",
    "Gym": "Exercise",
    "Run": "Exercise",
    "Dinner with Friends": "Social",
    "Clubbing": "Social",
    "Groceries": "Errands",
    "Commute to Campus": "Commute",
    "Commute Home": "Commute",
    "Rest & Relax": "Rest",
}

# Ensure categories exist
for name, color in CATEGORY_COLORS.items():
    Category.objects.update_or_create(name=name, defaults={"color": color})

try:
    user = User.objects.get(username="Oliver_Wincott")
except User.DoesNotExist:
    print("❌ User 'Oliver_Wincott' not found.")
    exit()

start_date = datetime(2025, 4, 28).date()  # Fixed start date
days_to_generate = 14  # Two weeks

for i in range(days_to_generate):
    current_date = start_date + timedelta(days=i)
    weekday = current_date.weekday()
    events_created = []

    def create_event(title, description, start_t, end_t):
        event = CalendarEvent.objects.create(
            title=title,
            description=description,
            start_time=timezone.make_aware(datetime.combine(current_date, start_t)),
            end_time=timezone.make_aware(datetime.combine(current_date, end_t)),
            user=user
        )
        category_name = TITLE_TO_CATEGORY.get(title)
        if category_name:
            category = Category.objects.get(name=category_name)
            EventCategory.objects.update_or_create(event=event, defaults={'category': category})
        events_created.append(event)

    if weekday < 5:  # Weekdays
        create_event("Commute to Campus", "Travel to university.", time(7, 45), time(8, 15))
        create_event("Morning Lecture", "Lecture on core subject.", time(8, 30), time(10, 0))
        create_event("Seminar", "Discussion and group work.", time(10, 30), time(11, 30))
        create_event("Library Session", "Focused study in the library.", time(12, 0), time(14, 0))
        create_event("Solo Study", "Review and notes.", time(14, 15), time(15, 15))
        create_event("Commute Home", "Return from university.", time(15, 30), time(16, 0))
        if random.random() < 0.8:
            create_event("Part-Time Job", "Evening shift.", time(16, 30), time(19, 30))
        if random.random() < 0.5:
            create_event("Gym", "Workout session.", time(20, 0), time(21, 0))
        if random.random() < 0.4:
            create_event("Dinner with Friends", "Evening hangout.", time(21, 15), time(22, 45))
    else:  # Weekends
        create_event("Rest & Relax", "Late wake-up and relax.", time(9, 30), time(11, 0))
        create_event("Groceries", "Weekly shopping.", time(11, 30), time(12, 30))
        create_event("Group Study", "Study with peers.", time(13, 30), time(15, 30))
        if random.random() < 0.6:
            create_event("Run", "Afternoon jog.", time(16, 0), time(17, 0))
        if random.random() < 0.7:
            create_event("Dinner with Friends", "Catch-up dinner.", time(18, 30), time(20, 30))
        if random.random() < 0.4 and weekday == 5:
            create_event("Clubbing", "Night out.", time(22, 30), time(1, 30))

    print(f"✅ {current_date}: {[e.title for e in events_created]}")

print("📘 University timetable created successfully.")
