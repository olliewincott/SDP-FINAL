import random
from datetime import datetime, timedelta, time
from django.contrib.auth.models import User
from django.utils import timezone
from calendar_app.models import CalendarEvent, Category, EventCategory

# Define color palette for categories
CATEGORY_COLORS = {
    "Commute": "#4b6cb7",
    "Work": "#f39c12",
    "Team Meeting": "#8e44ad",
    "Exercise": "#27ae60",
    "Household Chores": "#e74c3c",
    "Family Time": "#3498db",
    "Errands/Travel": "#2ecc71",
}

# Map event titles to category names
TITLE_TO_CATEGORY = {
    "Commute to Work": "Commute",
    "Commute from Work": "Commute",
    "Work": "Work",
    "Team Meeting": "Team Meeting",
    "Exercise": "Exercise",
    "Household Chores": "Household Chores",
    "Family Time": "Family Time",
    "Errands/Travel": "Errands/Travel",
}

# Ensure categories exist with colors
for name, color in CATEGORY_COLORS.items():
    Category.objects.update_or_create(name=name, defaults={"color": color})

# Fetch the user
user = User.objects.get(username="Oliver_Wincott")

start_date = datetime.today().date()
days_to_generate = 15

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
        # Assign category
        category_name = TITLE_TO_CATEGORY.get(title)
        if category_name:
            category = Category.objects.get(name=category_name)
            EventCategory.objects.update_or_create(event=event, defaults={'category': category})
        events_created.append(event)

    if weekday < 5:
        create_event("Commute to Work", "Morning commute to work.", time(6, 30), time(7, 0))
        create_event("Work", "Regular work shift.", time(7, 0), time(16, 0))
        create_event("Commute from Work", "Evening commute home.", time(16, 0), time(16, 30))

        if random.random() < 0.5:
            create_event("Team Meeting", "Daily stand-up meeting.", time(10, 0), time(10, 30))

        if random.random() < 0.7:
            create_event("Exercise", "Evening workout session.", time(18, 0), time(19, 0))

        if weekday in [1, 3]:
            create_event("Household Chores", "Evening chores.", time(19, 30), time(20, 0))
    else:
        create_event("Household Chores", "Weekend cleaning and chores.", time(9, 0), time(10, 0))
        create_event("Family Time", "Spend time with family or personal relaxation.", time(14, 0), time(16, 0))

        if random.random() < 0.5:
            create_event("Errands/Travel", "Running errands or short travel.", time(11, 0), time(12, 0))

    print(f"✅ Created events for {current_date}: {[e.title for e in events_created]}")

print("🎉 Timetable generation complete with color-tagged categories!")
