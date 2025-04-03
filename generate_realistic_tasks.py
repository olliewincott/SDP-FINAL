import random
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.utils import timezone
from calendar_app.models import Task

# Get the user "Oliver_Wincott"
user = User.objects.get(username="Oliver_Wincott")

# List of realistic tasks with title and description
realistic_tasks = [
    ("Send off invoice", "Send the invoice to the client for the completed project."),
    ("Call client", "Call the client to follow up on project details."),
    ("Prepare presentation", "Prepare slides and materials for the upcoming presentation."),
    ("Schedule meeting", "Set up a meeting to discuss project progress."),
    ("Review project report", "Review the project report and provide feedback."),
    ("Update website", "Update the website with the latest product information."),
    ("Order office supplies", "Place an order for the required office supplies."),
    ("Plan team outing", "Organize the details for the upcoming team outing."),
    ("Follow up on email", "Follow up on important emails with the client."),
    ("Draft contract", "Draft a new contract for an upcoming project."),
    ("Review budget", "Review and adjust the budget for this quarter."),
    ("Organize files", "Sort and organize the digital files on the shared drive."),
    ("Attend client meeting", "Participate in a meeting with a potential client."),
    ("Submit expense report", "Compile and submit the monthly expense report."),
    ("Conduct training", "Run a training session on the new software."),
    ("Plan marketing strategy", "Develop a marketing strategy for the next product launch."),
    ("Update CRM", "Update the CRM system with the latest client data."),
    ("Prepare invoice", "Prepare and send out the invoice for recent services."),
    ("Research new tools", "Investigate new tools to improve workflow."),
    ("Send follow-up email", "Send a follow-up email after a client meeting."),
]

# Define the start date: 30 days in the past
start_date = datetime.today().date() - timedelta(days=30)
# Total days to generate: 60 days (30 past + 30 future)
days_to_generate = 60

for i in range(days_to_generate):
    current_date = start_date + timedelta(days=i)
    # Randomly decide how many tasks to generate for this day (e.g., 0 to 3 tasks)
    num_tasks = random.randint(0, 3)
    for j in range(num_tasks):
        # Choose a realistic task template
        title, description = random.choice(realistic_tasks)
        # Generate a realistic due time between 8 AM and 6 PM
        hour = random.randint(8, 18)
        minute = random.choice([0, 15, 30, 45])
        due_time = datetime.combine(current_date, datetime.min.time()) + timedelta(hours=hour, minutes=minute)
        due_time = timezone.make_aware(due_time)
        
        # Randomly determine if the task is completed
        completed = random.choice([True, False])
        
        # Create the task with the realistic title and description
        task = Task.objects.create(
            user=user,
            title=title,
            description=description,
            completed=completed,
            due_date=due_time
        )
        print(f"Created task: {task.title} due {due_time}, completed: {completed}")

print("Realistic task data generation complete!")
