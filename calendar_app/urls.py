from django.urls import path, include
from . import views
from .views import db_test, add_event, delete_event, register  # Correct import with proper spacing
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('', views.index, name='index'),  # Home page
    path('planner/', views.fullcalendar_view, name='planner'),
    path('help/', views.help, name='help'),  # Help page
    path('chatbot/', views.chatbot, name='chatbot'),  # Chatbot page
    path('chatbot/response/', views.chatbot_response, name='chatbot_response'),  # Chatbot API
    path('db_test/', db_test, name='db_test'),
    path('add_event/', add_event, name='add_event'),
    path('delete_event/<int:event_id>/', delete_event, name='delete_event'),
    path('events/json/', views.events_json, name='events_json'),
    path('timetable/', views.fullcalendar_view, name='timetable'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('task/json/', views.all_tasks_json, name='all_tasks_json'),
    path('wellness/json/', views.daily_wellness_json, name='daily_wellness_json'),
    path('wellness/increment/', views.increment_wellness, name='increment_wellness'),
    path('productivity/monthly-json/', views.monthly_productivity_json, name='monthly_productivity_json'),
    path('analytics/', views.analytics_view, name='analytics'),
    path('calendar/', views.calendar_view, name='calendar'),
    path('tasks/', views.tasks_view, name='tasks'),
    path('task/update/', views.update_task_status, name='update_task_status'),
    path('wellness/monthly-json/', views.monthly_wellness_json, name='monthly_wellness_json'),
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('register/', register, name='register'),
    path('mood/create/', views.create_mood_entry, name='create_mood_entry'),
    path('ai/', views.ai_assistant_view, name='ai_assistant'),
    path('wellbeing/', views.wellbeing_view, name='wellbeing'),
    path('update-event-time/', views.update_event_time, name='update_event_time'),

]
