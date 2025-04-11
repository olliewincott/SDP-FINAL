console.log("Dashboard JS loaded!");

document.addEventListener('DOMContentLoaded', function () {
  // === CALENDAR LOGIC ===
  const calendarEl = document.getElementById('dashboard-calendar');
  const modalEl = document.getElementById('addEventModal');
  const eventModal = new bootstrap.Modal(modalEl);
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger me-auto';
  deleteBtn.textContent = 'Delete';
  let activeEventId = null;

  const modalFooter = modalEl.querySelector('.modal-footer');
  if (!modalFooter.querySelector('.btn-danger')) {
    modalFooter.insertBefore(deleteBtn, modalFooter.firstChild);
    deleteBtn.style.display = 'none';
  }

  deleteBtn.onclick = () => {
    if (activeEventId && confirm('Are you sure you want to delete this event?')) {
      fetch(`/delete_event/${activeEventId}/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCSRFToken() }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          eventModal.hide();
          window.dashboardCalendar.refetchEvents();
        } else {
          alert(data.error || 'Failed to delete.');
        }
      })
      .catch(() => alert('Server error during delete.'));
    }
  };

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
      eventContent: function(arg) {
        return { domNodes: [document.createTextNode(arg.event.title)] };
      },
      eventClick: function (info) {
        const event = info.event;
        activeEventId = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.extendedProps.description || '';
        document.getElementById('event-start').value = formatDateTimeLocal(event.start);
        document.getElementById('event-end').value = event.end ? formatDateTimeLocal(event.end) : '';
        document.getElementById('event-category').value = event.extendedProps.category_id || '';
        deleteBtn.style.display = 'inline-block';
        eventModal.show();
      },
      dateClick: function (info) {
        activeEventId = null;
        document.getElementById('addEventForm').reset();
        document.getElementById('event-start').value = formatDateTimeLocal(info.date);
        document.getElementById('event-end').value = formatDateTimeLocal(new Date(info.date.getTime() + 30 * 60000));
        deleteBtn.style.display = 'none';
        eventModal.show();
      },
      eventDrop: handleEventUpdate,
      eventResize: handleEventUpdate
    });

    window.dashboardCalendar = calendar;
    calendar.render();
  }

  document.getElementById('addEventForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    if (activeEventId) formData.append('id', activeEventId);

    fetch("/add_event/", {
      method: 'POST',
      headers: { 'X-CSRFToken': getCSRFToken() },
      body: formData
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        eventModal.hide();
        window.dashboardCalendar.refetchEvents();
      } else {
        alert(data.error || 'Could not create/update event.');
      }
    })
    .catch(() => alert("Server error"));
  });

  // === TASK HANDLING ===
  const taskForm = document.getElementById('addTaskForm');
  const taskList = document.getElementById('task-list');

  if (taskForm) {
    taskForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const formData = new FormData(taskForm);
      const editingId = taskForm.dataset.editing;
      const url = editingId ? `/edit_task/${editingId}/` : '/add_task/';

      fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCSRFToken() },
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.task) {
          bootstrap.Modal.getInstance(document.getElementById('addTaskModal')).hide();
          taskForm.reset();
          taskForm.removeAttribute('data-editing');

          const existingLi = taskList.querySelector(`[data-task-id="${data.task.id}"]`);
          if (existingLi) existingLi.remove();

          const li = buildTaskListItem(data.task);
          taskList.appendChild(li);
        } else {
          alert(data.error || 'Failed to save task.');
        }
      });
    });

    taskList.addEventListener('click', function (e) {
      const button = e.target.closest('button');
      if (!button) return;

      const taskId = button.dataset.id;

      if (button.classList.contains('delete-task-btn')) {
        if (confirm("Delete this task?")) {
          fetch(`/delete_task/${taskId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const li = taskList.querySelector(`[data-task-id="${taskId}"]`);
              if (li) li.remove();
              if (!taskList.querySelector('li')) {
                taskList.innerHTML = '<li class="text-muted">No tasks for today.</li>';
              }
            }
          })
          .catch(() => alert('Failed to delete task.'));
        }
      }

      if (button.classList.contains('edit-task-btn')) {
        document.getElementById('task-title').value = button.dataset.title;
        document.getElementById('task-description').value = button.dataset.description || '';
        document.getElementById('task-due-date').value = button.dataset.dueDate;
        taskForm.dataset.editing = taskId;
        new bootstrap.Modal(document.getElementById('addTaskModal')).show(); // ✅ fixed here
      }
    });
  }

  function buildTaskListItem(task) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center bg-dark text-light mb-2 rounded shadow-sm px-3 py-2';
    li.dataset.taskId = task.id;
    li.innerHTML = `
      <span>${task.title} - ${new Date(task.due_date).toLocaleString()}</span>
      <div>
        <button class="btn btn-sm btn-outline-light edit-task-btn" data-id="${task.id}" data-title="${task.title}" data-description="${task.description}" data-due-date="${task.due_date}"><i class="fas fa-pen"></i></button>
        <button class="btn btn-sm btn-outline-danger delete-task-btn" data-id="${task.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    return li;
  }

  // === REMINDER HANDLING ===
  const reminderForm = document.getElementById('addReminderForm');
  const reminderList = document.getElementById('reminder-list');

  if (reminderForm) {
    reminderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const formData = new FormData(reminderForm);
      const editingId = reminderForm.dataset.editing;
      const url = editingId ? `/edit_reminder/${editingId}/` : '/add_reminder/';

      fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCSRFToken() },
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.reminder) {
          bootstrap.Modal.getInstance(document.getElementById('addReminderModal')).hide();
          reminderForm.reset();
          reminderForm.removeAttribute('data-editing');

          const existingLi = reminderList.querySelector(`[data-reminder-id="${data.reminder.id}"]`);
          if (existingLi) existingLi.remove();

          const li = buildReminderListItem(data.reminder);
          reminderList.appendChild(li);
        } else {
          alert(data.error || 'Failed to save reminder.');
        }
      });
    });

    reminderList.addEventListener('click', function (e) {
      const button = e.target.closest('button');
      if (!button) return;

      const reminderId = button.dataset.id;

      if (button.classList.contains('delete-reminder-btn')) {
        fetch(`/delete_reminder/${reminderId}/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCSRFToken() }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const li = reminderList.querySelector(`[data-reminder-id="${reminderId}"]`);
            if (li) li.remove();
          }
        });
      }

      if (button.classList.contains('edit-reminder-btn')) {
        document.getElementById('reminder-event').value = button.dataset.eventId;
        document.getElementById('reminder-time').value = button.dataset.time;
        reminderForm.dataset.editing = reminderId;
        new bootstrap.Modal(document.getElementById('addReminderModal')).show(); // ✅ fixed here
      }
    });
  }

  function buildReminderListItem(reminder) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center bg-dark text-light mb-2 rounded shadow-sm px-3 py-2';
    li.dataset.reminderId = reminder.id;
    li.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="fas fa-bell text-info me-2 reminder-icon"></i>
        <span>${reminder.title}</span>
      </div>
      <div>
        <small class="text-muted">${new Date(reminder.reminder_time).toLocaleString()}</small>
        <button class="btn btn-sm btn-outline-light edit-reminder-btn" data-id="${reminder.id}" data-event-id="${reminder.event_id}" data-time="${reminder.reminder_time}"><i class="fas fa-pen"></i></button>
        <button class="btn btn-sm btn-outline-danger delete-reminder-btn" data-id="${reminder.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    return li;
  }

  // === EVENT UPDATE HANDLER ===
  function handleEventUpdate(info) {
    const eventId = info.event.id;
    const newStart = info.event.start.toISOString();
    const newEnd = info.event.end ? info.event.end.toISOString() : null;

    fetch("/update_event_time/", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({ id: eventId, start: newStart, end: newEnd })
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

  // === UTILS ===
  function formatDateTimeLocal(date) {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  }

  function getCSRFToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      if (c.trim().startsWith(name + '=')) {
        return c.trim().substring(name.length + 1);
      }
    }
    return '';
  }
});
