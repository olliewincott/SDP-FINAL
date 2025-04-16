console.log("📅 Dashboard JS loaded!");

document.addEventListener('DOMContentLoaded', function () {
  // === CSRF Token Helper ===
  window.getCSRFToken = function () {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      if (c.trim().startsWith(name + '=')) {
        return c.trim().substring(name.length + 1);
      }
    }
    return '';
  };

  // === FullCalendar Setup ===
  const calendarEl = document.getElementById('dashboard-calendar');
  const modalEl = document.getElementById('addEventModal');
  const eventModal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('addEventForm');
  const deleteBtn = document.getElementById('calendarDeleteEventBtn');
  const modalTitle = document.getElementById('addEventModalLabel');
  const saveBtn = document.getElementById('saveEventBtn');
  const eventIdInput = document.getElementById('event-id');
  let activeEventId = null;

  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      themeSystem: 'bootstrap',
      initialView: 'timeGridDay',
      height: 850,
      editable: true,
      eventResizableFromStart: true,
      headerToolbar: {
        left: 'prev today',
        center: 'title',
        right: 'next'
      },
      allDaySlot: false,
      nowIndicator: true,
      slotDuration: '00:30:00',
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      now: new Date(),
      scrollTime: (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
      })(),
      events: window.eventsJsonUrl,
      eventContent: function (arg) {
        return { domNodes: [document.createTextNode(arg.event.title)] };
      },
      eventClick: function (info) {
        const event = info.event;
        activeEventId = event.id;
        modalEl.classList.remove('hidden');  // Ensure the modal is shown
        form.dataset.editing = activeEventId;  // Mark as editing
        
        // Populate the modal fields with event data
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.extendedProps.description || '';
        document.getElementById('event-start').value = formatDateTimeLocal(event.start);
        document.getElementById('event-end').value = event.end ? formatDateTimeLocal(event.end) : '';
        document.getElementById('event-category').value = event.extendedProps.category_id || '';
        document.getElementById('event-id').value = event.id; // Event ID for reference

        // Show delete button for updates
        deleteBtn.style.display = 'inline-block';
        modalTitle.textContent = 'Update Event';
        saveBtn.textContent = 'Update Event';
      },
      dateClick: function (info) {
        activeEventId = null;
        form.reset();
        form.removeAttribute('data-editing');
        
        // Set default values for a new event
        modalEl.classList.remove('hidden');
        document.getElementById('event-start').value = formatDateTimeLocal(info.date);
        document.getElementById('event-end').value = formatDateTimeLocal(new Date(info.date.getTime() + 30 * 60000));  // Default end time (30 mins later)
        document.getElementById('event-id').value = ''; // Clear the ID for a new event
        deleteBtn.style.display = 'none'; // Hide delete button for new event
        modalTitle.textContent = 'Add New Event';
        saveBtn.textContent = 'Create Event';
      },
      eventDrop: handleEventUpdate,
      eventResize: handleEventUpdate
    });

    window.dashboardCalendar = calendar;
    calendar.render();
  }

  // === Event Form Submission ===
  form?.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const isEditing = form.dataset.editing;
    if (isEditing) formData.append('id', isEditing);

    fetch("/add_event/", {
      method: 'POST',
      headers: { 'X-CSRFToken': window.getCSRFToken() },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        modalEl.classList.add('hidden'); // Hide modal after successful operation
        form.reset();
        form.removeAttribute('data-editing');
        window.dashboardCalendar.refetchEvents(); // Refresh the events on the calendar
      } else {
        alert(data.error || 'Could not create/update event.');
      }
    })
    .catch(() => alert("Server error"));
  });

  // === Delete Event ===
  deleteBtn?.addEventListener('click', function () {
    const editingId = form.dataset.editing;
    if (editingId && confirm("Are you sure you want to delete this event?")) {
      fetch(`/delete_event/${editingId}/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': window.getCSRFToken() }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          modalEl.classList.add('hidden'); // Hide modal after successful operation
          form.reset();
          form.removeAttribute('data-editing');
          window.dashboardCalendar.refetchEvents(); // Refresh the events on the calendar
        } else {
          alert(data.error || 'Failed to delete.');
        }
      })
      .catch(() => alert("Server error during delete."));
    }
  });

  function handleEventUpdate(info) {
    fetch("/update_event_time/", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.getCSRFToken()
      },
      body: JSON.stringify({
        id: info.event.id,
        start: info.event.start.toISOString(),
        end: info.event.end ? info.event.end.toISOString() : null
      })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("Failed to update event.");
        info.revert();
      }
    })
    .catch(() => {
      alert("Server error.");
      info.revert();
    });
  }

  function formatDateTimeLocal(date) {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString().slice(0, 16);
  }

  // === Modal Close Handlers (for Tailwind modals)
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.fixed');
      if (modal) modal.classList.add('hidden');
    });
  });

  // === Dropdown Toggle Logic
  document.querySelectorAll('[data-dropdown-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-dropdown-btn');
      document.querySelectorAll('[data-dropdown-menu]').forEach(menu => {
        menu.classList.add('hidden');
      });
      const menu = document.querySelector(`[data-dropdown-menu="${type}"]`);
      if (menu) menu.classList.toggle('hidden');
    });
  });

  // === Add Actions
  document.querySelectorAll('[data-action="add-reminder"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('addReminderModal');
      modal.classList.remove('hidden');
      modal.querySelector('form').reset();
      modal.querySelector('form').removeAttribute('data-editing');
      modal.querySelector('h3').textContent = "Add New Reminder";
      modal.querySelector('button[type="submit"]').textContent = "Create Reminder";
      document.querySelector('[data-dropdown-menu="reminder"]')?.classList.add('hidden');
    });
  });

  document.querySelectorAll('[data-action="add-task"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('addTaskModal');
      modal.classList.remove('hidden');
      modal.querySelector('form').reset();
      modal.querySelector('form').removeAttribute('data-editing');
      modal.querySelector('h3').textContent = "Add New Task";
      modal.querySelector('button[type="submit"]').textContent = "Create Task";
      document.querySelector('[data-dropdown-menu="task"]')?.classList.add('hidden');
    });
  });

  // === Toggle Edit Buttons
  document.querySelectorAll('[data-action="toggle-task-edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#task-list-wrapper .edit-task-btn, #task-list-wrapper .delete-task-btn')
        .forEach(el => el.classList.toggle('hidden'));
      document.querySelector('[data-dropdown-menu="task"]')?.classList.add('hidden');
    });
  });

  document.querySelectorAll('[data-action="toggle-reminder-edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#reminder-list-wrapper .edit-reminder-btn, #reminder-list-wrapper .delete-reminder-btn')
        .forEach(el => el.classList.toggle('hidden'));
      document.querySelector('[data-dropdown-menu="reminder"]')?.classList.add('hidden');
    });
  });

  // === Handle Edit Button Clicks
  document.addEventListener('click', function (e) {
    const editReminder = e.target.closest('.edit-reminder-btn');
    if (editReminder) {
      const modal = document.getElementById('addReminderModal');
      const form = modal.querySelector('form');
      modal.classList.remove('hidden');
      form.dataset.editing = editReminder.dataset.id;
      modal.querySelector('#reminder-event').value = editReminder.dataset.eventId;
      modal.querySelector('#reminder-time').value = editReminder.dataset.time;
      modal.querySelector('h3').textContent = "Update Reminder";
      modal.querySelector('button[type="submit"]').textContent = "Update Reminder";
      document.querySelector('[data-dropdown-menu="reminder"]')?.classList.add('hidden');
    }

    const editTask = e.target.closest('.edit-task-btn');
    if (editTask) {
      const modal = document.getElementById('addTaskModal');
      const form = modal.querySelector('form');
      modal.classList.remove('hidden');
      form.dataset.editing = editTask.dataset.id;
      modal.querySelector('#task-title').value = editTask.dataset.title;
      modal.querySelector('#task-description').value = editTask.dataset.description;
      modal.querySelector('#task-due-date').value = editTask.dataset.dueDate;
      modal.querySelector('h3').textContent = "Update Task";
      modal.querySelector('button[type="submit"]').textContent = "Update Task";
      document.querySelector('[data-dropdown-menu="task"]')?.classList.add('hidden');
    }
  });

  // === Close all dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-dropdown-btn]') && !e.target.closest('[data-dropdown-menu]')) {
      document.querySelectorAll('[data-dropdown-menu]').forEach(menu => menu.classList.add('hidden'));
    }
  });
});