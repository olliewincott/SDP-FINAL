#!/usr/bin/env python
import os
import django
import random
from datetime import datetime, timedelta, time

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdproject.settings')  # Update if your settings file path differs
django.setup()

from django.utils import timezone
from django.contrib.auth.models import User
from calendar_app.models import Task

# Get the user
user = User.objects.get(username="Oliver_Wincott")

# Define realistic university-focused tasks
academic_tasks = [
    ("Write essay", "Draft and complete assigned university essay."),
    ("Review lecture notes", "Go over notes from today's lecture."),
    ("Group project update", "Coordinate with team and submit update."),
    ("Read assigned chapter", "Read the required chapter for upcoming seminar."),
    ("Submit assignment", "Finalize and upload your coursework."),
    ("Attend office hours", "Meet professor to discuss coursework."),
    ("Lab report", "Complete and submit lab report."),
    ("Practice problems", "Solve exercises to prepare for exams."),
    ("Presentation prep", "Prepare slides and speaking notes."),
    ("Library research", "Research sources for academic writing."),
    ("Edit draft", "Refine the first draft of your paper."),
    ("Check plagiarism", "Run assignment through plagiarism checker."),
    ("Plan study schedule", "Organize study sessions for exams."),
    ("Email professor", "Clarify assignment requirements."),
    ("Watch lecture recording", "Catch up on missed lecture."),
    ("Peer review", "Give feedback to peer’s draft."),
    ("Backup files", "Ensure all work is saved and backed up."),
    ("Join study group", "Collaborate with classmates."),
    ("Complete quiz", "Take the scheduled online quiz."),
    ("Set calendar reminders", "Schedule deadlines and meetings."),
]

# Time window: 30 days in past to 30 days in future
start_date = datetime.today().date() - timedelta(days=30)
end_date = datetime.today().date() + timedelta(days=30)

for i in range((end_date - start_date).days):
    current_date = start_date + timedelta(days=i)
    # More tasks on weekdays
    task_count = random.randint(1, 3) if current_date.weekday() < 5 else random.choices([0, 1, 2], weights=[0.4, 0.4, 0.2])[0]

    for _ in range(task_count):
        title, description = random.choice(academic_tasks)
        hour = random.randint(9, 20)
        minute = random.choice([0, 15, 30, 45])
        due_time = timezone.make_aware(datetime.combine(current_date, time(hour, minute)))
        completed = random.choices([True, False], weights=[0.4, 0.6])[0]

        task = Task.objects.create(
            user=user,
            title=title,
            description=description,
            due_date=due_time,
            completed=completed
        )
        print(f"📝 Created: {title} on {due_time}, completed: {completed}")

print("✅ University-style academic tasks generated.")