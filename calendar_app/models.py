from django.db import models
from django.contrib.auth.models import User  # Using Django's built-in User model
from datetime import date

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

    def __str__(self):
        return self.name

class EventCategory(models.Model):
    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('event', 'category')

class Reminder(models.Model):
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
    water_intake = models.IntegerField(default=0)  # e.g., glasses of water
    movement_breaks = models.IntegerField(default=0)
    healthy_meals = models.IntegerField(default=0)
