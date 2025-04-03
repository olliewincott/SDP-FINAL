import random
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.utils import timezone
from calendar_app.models import DailyWellness

# Fetch the user "Oliver_Wincott"
user = User.objects.get(username="Oliver_Wincott")

# Define the start date: 30 days ago from today
start_date = datetime.today().date() - timedelta(days=30)

# Generate wellness stats for the previous 30 days
for i in range(30):
    current_date = start_date + timedelta(days=i)
    water_intake = random.randint(4, 12)         # glasses of water per day
    movement_breaks = random.randint(1, 6)         # number of movement breaks
    healthy_meals = random.randint(1, 3)           # number of healthy meals
    wellness_entry = DailyWellness.objects.create(
        user=user,
        date=current_date,
        water_intake=water_intake,
        movement_breaks=movement_breaks,
        healthy_meals=healthy_meals
    )
    print(f"Created DailyWellness for {current_date}: water {water_intake}, breaks {movement_breaks}, meals {healthy_meals}")

print("Wellness stats generation complete!")
