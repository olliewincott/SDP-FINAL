from django.db import models
from django.contrib.auth.models import User  # Using Django's built-in User model
from datetime import date
from django.utils import timezone

class CalendarEvent(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(max_length=255)  # ✅ Add this line if missing
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # ✅ Link to Django User Model

    def __str__(self):
        return self.title

class Category(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#5ac8fa")  # e.g. HEX color like "#FF5733"

    def __str__(self):
        return self.name


class EventCategory(models.Model):
    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('event', 'category')

class Reminder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Add this line
    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE)
    reminder_time = models.DateTimeField()

    def __str__(self):
        return f"Reminder for {self.event.title} at {self.reminder_time}"

class TestEntry(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()

    def __str__(self):
        return self.title  

class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Add this line
    title = models.CharField(max_length=200, default="Untitled Task")
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title
    

class DailyWellness(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(default=date.today)

    # Actual counts
    water_intake = models.IntegerField(default=0)
    movement_breaks = models.IntegerField(default=0)
    healthy_meals = models.IntegerField(default=0)

    # Goals
    water_goal = models.IntegerField(default=8)
    breaks_goal = models.IntegerField(default=3)
    meals_goal = models.IntegerField(default=3)

    # New features
    goal_completed = models.BooleanField(default=False)  # for streaks
    level = models.IntegerField(default=1)               # for gamification
    xp = models.IntegerField(default=0)                  # experience points

    def has_met_goals(self):
        return (
            self.water_intake >= self.water_goal and
            self.movement_breaks >= self.breaks_goal and
            self.healthy_meals >= self.meals_goal
        )

    def __str__(self):
        return f"{self.user.username} - {self.date}"

class MoodEntry(models.Model):
    MOOD_CHOICES = [
        (1, "Very Bad"),
        (2, "Bad"),
        (3, "Poor"),
        (4, "Below Average"),
        (5, "Average"),
        (6, "Above Average"),
        (7, "Good"),
        (8, "Very Good"),
        (9, "Excellent"),
        (10, "Outstanding"),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    mood_rating = models.PositiveSmallIntegerField(choices=MOOD_CHOICES, default=5)
    note = models.TextField(blank=True, null=True, help_text="Optional note to describe your mood")

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.get_mood_rating_display()}"


class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=[('user', 'User'), ('assistant', 'Assistant')])
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.role}): {self.content[:30]}"