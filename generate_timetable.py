import random
from datetime import datetime, timedelta, time
from django.contrib.auth.models import User
from django.utils import timezone
from calendar_app.models import CalendarEvent

# Fetch the user "Oliver_Wincott"
user = User.objects.get(username="Oliver_Wincott")

# Define the start date and number of days for 2 weeks (today plus the next 14 days)
start_date = datetime.today().date()
days_to_generate = 15  # 15 days including today

for i in range(days_to_generate):
    current_date = start_date + timedelta(days=i)
    weekday = current_date.weekday()  # Monday=0, Sunday=6
    events_created = []  # To keep track of events created for each day

    if weekday < 5:  # Weekdays: Monday-Friday
        # Morning commute to work: 6:30am to 7:00am
        commute_to_start = timezone.make_aware(datetime.combine(current_date, time(6, 30)))
        commute_to_end = timezone.make_aware(datetime.combine(current_date, time(7, 0)))
        event = CalendarEvent.objects.create(
            title="Commute to Work",
            description="Morning commute to work.",
            start_time=commute_to_start,
            end_time=commute_to_end,
            user=user,
        )
        events_created.append(event)

        # Work shift: 7:00am to 4:00pm
        work_start = timezone.make_aware(datetime.combine(current_date, time(7, 0)))
        work_end = timezone.make_aware(datetime.combine(current_date, time(16, 0)))
        event = CalendarEvent.objects.create(
            title="Work",
            description="Regular work shift.",
            start_time=work_start,
            end_time=work_end,
            user=user,
        )
        events_created.append(event)

        # Evening commute from work: 4:00pm to 4:30pm
        commute_from_start = timezone.make_aware(datetime.combine(current_date, time(16, 0)))
        commute_from_end = timezone.make_aware(datetime.combine(current_date, time(16, 30)))
        event = CalendarEvent.objects.create(
            title="Commute from Work",
            description="Evening commute home.",
            start_time=commute_from_start,
            end_time=commute_from_end,
            user=user,
        )
        events_created.append(event)

        # Optional daily team meeting (50% chance): 10:00am to 10:30am
        if random.random() < 0.5:
            meeting_start = timezone.make_aware(datetime.combine(current_date, time(10, 0)))
            meeting_end = timezone.make_aware(datetime.combine(current_date, time(10, 30)))
            event = CalendarEvent.objects.create(
                title="Team Meeting",
                description="Daily stand-up meeting.",
                start_time=meeting_start,
                end_time=meeting_end,
                user=user,
            )
            events_created.append(event)

        # Optional evening exercise session (70% chance): 6:00pm to 7:00pm
        if random.random() < 0.7:
            exercise_start = timezone.make_aware(datetime.combine(current_date, time(18, 0)))
            exercise_end = timezone.make_aware(datetime.combine(current_date, time(19, 0)))
            event = CalendarEvent.objects.create(
                title="Exercise",
                description="Evening workout session.",
                start_time=exercise_start,
                end_time=exercise_end,
                user=user,
            )
            events_created.append(event)

        # Optional household chores on Tuesday and Thursday: 7:30pm to 8:00pm
        if weekday in [1, 3]:
            chores_start = timezone.make_aware(datetime.combine(current_date, time(19, 30)))
            chores_end = timezone.make_aware(datetime.combine(current_date, time(20, 0)))
            event = CalendarEvent.objects.create(
                title="Household Chores",
                description="Evening chores.",
                start_time=chores_start,
                end_time=chores_end,
                user=user,
            )
            events_created.append(event)
    else:
        # Weekends (Saturday & Sunday)
        # Morning household chores: 9:00am to 10:00am
        chores_start = timezone.make_aware(datetime.combine(current_date, time(9, 0)))
        chores_end = timezone.make_aware(datetime.combine(current_date, time(10, 0)))
        event = CalendarEvent.objects.create(
            title="Household Chores",
            description="Weekend cleaning and chores.",
            start_time=chores_start,
            end_time=chores_end,
            user=user,
        )
        events_created.append(event)

        # Family time or personal time: 2:00pm to 4:00pm
        personal_start = timezone.make_aware(datetime.combine(current_date, time(14, 0)))
        personal_end = timezone.make_aware(datetime.combine(current_date, time(16, 0)))
        event = CalendarEvent.objects.create(
            title="Family Time",
            description="Spend time with family or personal relaxation.",
            start_time=personal_start,
            end_time=personal_end,
            user=user,
        )
        events_created.append(event)

        # Optional errands or travel (50% chance): 11:00am to 12:00pm
        if random.random() < 0.5:
            errands_start = timezone.make_aware(datetime.combine(current_date, time(11, 0)))
            errands_end = timezone.make_aware(datetime.combine(current_date, time(12, 0)))
            event = CalendarEvent.objects.create(
                title="Errands/Travel",
                description="Running errands or short travel.",
                start_time=errands_start,
                end_time=errands_end,
                user=user,
            )
            events_created.append(event)

    print(f"Created events for {current_date}: {[e.title for e in events_created]}")

print("Timetable generation complete!")
