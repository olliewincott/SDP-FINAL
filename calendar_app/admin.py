from django.contrib import admin
from .models import CalendarEvent, Reminder, Category, EventCategory, Task, DailyWellness, MoodEntry

admin.site.register(CalendarEvent)
admin.site.register(Reminder)
admin.site.register(Category)
admin.site.register(EventCategory)
admin.site.register(Task)
admin.site.register(DailyWellness)
admin.site.register(MoodEntry)


