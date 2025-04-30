from django.test import TestCase
from django.contrib.auth.models import User
from .models import (
    CalendarEvent, Category, EventCategory, Reminder, Task,
    DailyWellness, MoodEntry, ChatMessage, TestEntry
)
from datetime import datetime, timedelta, date
from django.utils import timezone

class ModelTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')

    def test_calendar_event_creation(self):
        event = CalendarEvent.objects.create(
            title='Team Meeting',
            description='Discuss project milestones',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            user=self.user
        )
        self.assertEqual(event.title, 'Team Meeting')
        print('✅ test_calendar_event_creation passed')

    def test_category_creation(self):
        category = Category.objects.create(name='Work', color='#FF5733')
        self.assertEqual(category.name, 'Work')
        print('✅ test_category_creation passed')

    def test_event_category_link(self):
        event = CalendarEvent.objects.create(
            title='Doctor Appointment',
            description='Health check-up',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            user=self.user
        )
        category = Category.objects.create(name='Health', color='#00FF00')
        link = EventCategory.objects.create(event=event, category=category)
        self.assertEqual(link.event.title, 'Doctor Appointment')
        self.assertEqual(link.category.name, 'Health')
        print('✅ test_event_category_link passed')

    def test_reminder_creation(self):
        event = CalendarEvent.objects.create(
            title='Lunch Meeting',
            description='Discuss quarterly goals',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            user=self.user
        )
        reminder = Reminder.objects.create(
            user=self.user,
            event=event,
            custom_title='Reminder for Lunch',
            reminder_time=timezone.now() + timedelta(minutes=30)
        )
        self.assertEqual(reminder.custom_title, 'Reminder for Lunch')
        print('✅ test_reminder_creation passed')

    def test_task_creation_and_completion(self):
        task = Task.objects.create(
            user=self.user,
            title='Finish Assignment',
            description='Software development project',
            completed=False
        )
        self.assertFalse(task.completed)
        task.completed = True
        task.save()
        self.assertTrue(task.completed)
        print('✅ test_task_creation_and_completion passed')

    def test_daily_wellness_tracking(self):
        wellness = DailyWellness.objects.create(
            user=self.user,
            date=date.today(),
            water_intake=8,
            movement_breaks=3,
            healthy_meals=3
        )
        self.assertTrue(wellness.has_met_goals())
        print('✅ test_daily_wellness_tracking passed')

    def test_mood_entry_creation(self):
        mood_entry = MoodEntry.objects.create(
            user=self.user,
            mood_rating=8,
            note="Feeling very good!"
        )
        self.assertEqual(mood_entry.get_mood_rating_display(), "Very Good")
        print('✅ test_mood_entry_creation passed')

    def test_chat_message_creation(self):
        message = ChatMessage.objects.create(
            user=self.user,
            role='user',
            content="Schedule meeting at 3 PM"
        )
        self.assertEqual(message.role, 'user')
        self.assertIn("Schedule meeting", message.content)
        print('✅ test_chat_message_creation passed')

    def test_test_entry_creation(self):
        test_entry = TestEntry.objects.create(
            title='Sample Entry',
            description='Testing the TestEntry model'
        )
        self.assertEqual(test_entry.title, 'Sample Entry')
        print('✅ test_test_entry_creation passed')