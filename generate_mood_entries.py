import random
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.utils import timezone
from calendar_app.models import MoodEntry

# Fetch the user "Oliver_Wincott"
user = User.objects.get(username="Oliver_Wincott")

# List of sample notes for mood entries (optional)
sample_notes = [
    "Felt great today after a good workout.",
    "A bit stressed with work, but managed well.",
    "Had an amazing day with friends!",
    "Feeling a little low today.",
    "Productive day with a positive vibe.",
    "Everything seems to be going well.",
    "A challenging day, but learned a lot.",
    "I am really happy with how things turned out today.",
    "Not the best day, but tomorrow is a new start.",
    ""
]

# Define the start date: 30 days ago from today
start_date = datetime.today().date() - timedelta(days=30)

# Generate MoodEntry data for the last 30 days
for i in range(30):
    entry_date = start_date + timedelta(days=i)
    
    # Randomly choose a mood rating between 1 and 10
    mood_rating = random.randint(1, 10)
    
    # Randomly choose a note (or empty string for no note)
    note = random.choice(sample_notes)
    
    mood_entry = MoodEntry.objects.create(
        user=user,
        date=entry_date,
        mood_rating=mood_rating,
        note=note
    )
    
    print(f"Created MoodEntry for {entry_date}: Rating {mood_rating}, Note: {note}")

print("MoodEntry data generation complete!")
