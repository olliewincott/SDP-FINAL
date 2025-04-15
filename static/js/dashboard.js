
console.log("Dashboard JS loaded!");

document.addEventListener('DOMContentLoaded', function () {
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
        document.getElementById('event-id').value = event.id;

        deleteBtn.style.display = 'inline-block';
        modalTitle.textContent = 'Update Event';
        saveBtn.textContent = 'Update Event';
        eventModal.show();
      },

      dateClick: function (info) {
        activeEventId = null;
        form.reset();

        document.getElementById('event-start').value = formatDateTimeLocal(info.date);
        document.getElementById('event-end').value = formatDateTimeLocal(new Date(info.date.getTime() + 30 * 60000));
        eventIdInput.value = '';

        deleteBtn.style.display = 'none';
        modalTitle.textContent = 'Add New Event';
        saveBtn.textContent = 'Create Event';
        eventModal.show();
      },

      eventDrop: handleEventUpdate,
      eventResize: handleEventUpdate
    });

    window.dashboardCalendar = calendar;
    calendar.render();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    if (activeEventId) formData.append('id', activeEventId);

    fetch("/add_event/", {
      method: 'POST',
      headers: { 'X-CSRFToken': getCSRFToken() },
      body: formData
    })
    .then(res => res.json())
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

  deleteBtn.addEventListener('click', function () {
    if (activeEventId && confirm("Are you sure you want to delete this event?")) {
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
      .catch(() => alert("Server error during delete."));
    }
  });

  function handleEventUpdate(info) {
    fetch("/update_event_time/", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
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


document.addEventListener('DOMContentLoaded', function () {
  // --- Move getCSRFToken to here so it's available to all code ---
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
  document.addEventListener('DOMContentLoaded', function () {
    // Make sure getCSRFToken() is defined globally in this callback.
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
  
    document.addEventListener('DOMContentLoaded', function () {
      // Make sure getCSRFToken() is defined globally in this callback.
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
    
      document.addEventListener('DOMContentLoaded', function () {
  // Global CSRF token function
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



  document.addEventListener('DOMContentLoaded', function () {
    // Global CSRF token function
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
  
    // === TASK HANDLING ===
    const taskForm = document.getElementById('addTaskForm');
    const taskList = document.getElementById('task-list');
    const taskModalEl = document.getElementById('addTaskModal');
    const taskModalLabel = document.getElementById('addTaskModalLabel');
  
    if (taskForm) {
      // Task form submission (create or update)
      taskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        console.log("Submitting task form...");
        const formData = new FormData(taskForm);
        const editingId = taskForm.dataset.editing;
        const url = editingId ? `/edit_task/${editingId}/` : '/add_task/';
  
        fetch(url, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCSRFToken() },
          body: formData
        })
          .then(res => {
            if (!res.ok) {
              return res.text().then(text => { throw new Error(text); });
            }
            return res.json();
          })
          .then(data => {
            console.log("Task response:", data);
            if (data.success && data.task) {
              bootstrap.Modal.getInstance(taskModalEl).hide();
              taskForm.reset();
              taskForm.removeAttribute('data-editing');
              const existingLi = taskList.querySelector(`[data-task-id="${data.task.id}"]`);
              if (existingLi) existingLi.remove();
              const li = buildTaskListItem(data.task);
              taskList.appendChild(li);
            } else {
              alert(data.error || 'Failed to save task.');
            }
          })
          .catch(err => {
            console.error("Error updating/creating task:", err);
            alert("Error saving task. Check server.");
          });
      });
  
      // Task list click events for edit and delete buttons
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
              .then(res => {
                if (!res.ok) {
                  return res.text().then(text => { throw new Error(text); });
                }
                return res.json();
              })
              .then(data => {
                if (data.success) {
                  const li = taskList.querySelector(`[data-task-id="${taskId}"]`);
                  if (li) li.remove();
                  if (!taskList.querySelector('li')) {
                    taskList.innerHTML = '<li class="text-muted">No tasks for today.</li>';
                  }
                } else {
                  alert(data.error || 'Delete failed.');
                }
              })
              .catch(err => {
                console.error("Error deleting task:", err);
                alert('Failed to delete task.');
              });
          }
        }
  
        if (button.classList.contains('edit-task-btn')) {
          // Set modal to update mode
          taskModalLabel.textContent = "Update Task";
          const taskSaveBtn = taskModalEl.querySelector('button[type="submit"]');
          if (taskSaveBtn) {
            taskSaveBtn.textContent = "Update Task";
          }
          // Add or show delete button in modal footer
          const modalFooter = taskModalEl.querySelector('.modal-footer');
          let deleteBtn = modalFooter.querySelector('.delete-task-modal-btn');
          if (!deleteBtn) {
            deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger delete-task-modal-btn';
            deleteBtn.textContent = 'Delete';
            modalFooter.insertBefore(deleteBtn, modalFooter.firstChild);
          }
          deleteBtn.style.display = 'inline-block';
          deleteBtn.onclick = function () {
            if (confirm("Delete this task?")) {
              const editingId = taskForm.dataset.editing;
              fetch(`/delete_task/${editingId}/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCSRFToken() }
              })
                .then(res => {
                  if (!res.ok) {
                    return res.text().then(text => { throw new Error(text); });
                  }
                  return res.json();
                })
                .then(data => {
                  if (data.success) {
                    bootstrap.Modal.getInstance(taskModalEl).hide();
                    taskForm.reset();
                    taskForm.removeAttribute('data-editing');
                    const li = taskList.querySelector(`[data-task-id="${editingId}"]`);
                    if (li) li.remove();
                  } else {
                    alert(data.error || "Delete failed");
                  }
                })
                .catch(err => {
                  console.error("Error deleting task:", err);
                  alert("Error deleting task.");
                });
            }
          };
  
          // Populate form fields with task data
          document.getElementById('task-title').value = button.dataset.title;
          document.getElementById('task-description').value = button.dataset.description || '';
          document.getElementById('task-due-date').value = button.dataset.dueDate;
          taskForm.dataset.editing = taskId;
          new bootstrap.Modal(taskModalEl).show();
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
          <button class="btn btn-sm btn-outline-light edit-task-btn"
            data-id="${task.id}"
            data-title="${task.title}"
            data-description="${task.description || ''}"
            data-due-date="${task.due_date}">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-task-btn" data-id="${task.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      return li;
    }
  
    // Reset Task Modal on close — restore title, save button text, and hide delete button.
    taskModalEl.addEventListener('hidden.bs.modal', function () {
      taskModalLabel.textContent = "Add New Task";
      const taskSaveBtn = taskModalEl.querySelector('button[type="submit"]');
      if (taskSaveBtn) {
        taskSaveBtn.textContent = "Create Task";
      }
      const modalFooter = taskModalEl.querySelector('.modal-footer');
      let deleteBtn = modalFooter.querySelector('.delete-task-modal-btn');
      if (deleteBtn) {
        deleteBtn.style.display = 'none';
      }
    });
  
    // === REMINDER HANDLING ===
    const reminderForm = document.getElementById('addReminderForm');
    const reminderList = document.getElementById('reminder-list');
    const reminderModalEl = document.getElementById('addReminderModal');
    const reminderModalLabel = document.getElementById('addReminderModalLabel');
  
    if (reminderForm) {
      // Reminder form submission (create or update)
      reminderForm.addEventListener('submit', function (e) {
        e.preventDefault();
        console.log("Submitting reminder form...");
        const formData = new FormData(reminderForm);
        const editingId = reminderForm.dataset.editing;
        const url = editingId ? `/edit_reminder/${editingId}/` : '/add_reminder/';
  
        fetch(url, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCSRFToken() },
          body: formData
        })
          .then(res => {
            if (!res.ok) {
              return res.text().then(text => { throw new Error(text); });
            }
            return res.json();
          })
          .then(data => {
            console.log("Reminder response:", data);
            if (data.success && data.reminder) {
              bootstrap.Modal.getInstance(reminderModalEl).hide();
              reminderForm.reset();
              reminderForm.removeAttribute('data-editing');
              const existingLi = reminderList.querySelector(`[data-reminder-id="${data.reminder.id}"]`);
              if (existingLi) existingLi.remove();
              const li = buildReminderListItem(data.reminder);
              reminderList.appendChild(li);
            } else {
              alert(data.error || 'Failed to save reminder.');
            }
          })
          .catch(err => {
            console.error("Error updating/creating reminder:", err);
            alert("Error saving reminder. Check server.");
          });
      });
  
      // Reminder list click events for edit and delete buttons
      reminderList.addEventListener('click', function (e) {
        const button = e.target.closest('button');
        if (!button) return;
        const reminderId = button.dataset.id;
  
        if (button.classList.contains('delete-reminder-btn')) {
          fetch(`/delete_reminder/${reminderId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
          })
            .then(res => {
              if (!res.ok) {
                return res.text().then(text => { throw new Error(text); });
              }
              return res.json();
            })
            .then(data => {
              if (data.success) {
                const li = reminderList.querySelector(`[data-reminder-id="${reminderId}"]`);
                if (li) li.remove();
              } else {
                alert(data.error || 'Delete failed.');
              }
            })
            .catch(err => {
              console.error("Error deleting reminder:", err);
              alert('Failed to delete reminder.');
            });
        }
  
        if (button.classList.contains('edit-reminder-btn')) {
          reminderModalLabel.textContent = "Update Reminder";
          const reminderSaveBtn = reminderModalEl.querySelector('button[type="submit"]');
          if (reminderSaveBtn) {
            reminderSaveBtn.textContent = "Update Reminder";
          }
          const modalFooter = reminderModalEl.querySelector('.modal-footer');
          let deleteBtn = modalFooter.querySelector('.delete-reminder-modal-btn');
          if (!deleteBtn) {
            deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger delete-reminder-modal-btn';
            deleteBtn.textContent = 'Delete';
            modalFooter.insertBefore(deleteBtn, modalFooter.firstChild);
          }
          deleteBtn.style.display = 'inline-block';
          deleteBtn.onclick = function () {
            if (confirm("Delete this reminder?")) {
              const editingId = reminderForm.dataset.editing;
              fetch(`/delete_reminder/${editingId}/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCSRFToken() }
              })
                .then(res => {
                  if (!res.ok) {
                    return res.text().then(text => { throw new Error(text); });
                  }
                  return res.json();
                })
                .then(data => {
                  if (data.success) {
                    bootstrap.Modal.getInstance(reminderModalEl).hide();
                    reminderForm.reset();
                    reminderForm.removeAttribute('data-editing');
                    const li = reminderList.querySelector(`[data-reminder-id="${editingId}"]`);
                    if (li) li.remove();
                  } else {
                    alert(data.error || "Delete failed");
                  }
                })
                .catch(err => {
                  console.error("Error deleting reminder:", err);
                  alert("Error deleting reminder.");
                });
            }
          };
  
          // Populate reminder form fields (ensure your modal has an input with id "reminder-title")
          if (document.getElementById('reminder-title')) {
            document.getElementById('reminder-title').value = button.dataset.title;
          }
          document.getElementById('reminder-event').value = button.dataset.eventId;
          document.getElementById('reminder-time').value = button.dataset.time;
          reminderForm.dataset.editing = reminderId;
          new bootstrap.Modal(reminderModalEl).show();
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
          <button class="btn btn-sm btn-outline-light edit-reminder-btn"
            data-id="${reminder.id}"
            data-title="${reminder.title}"
            data-event-id="${reminder.event_id}"
            data-time="${reminder.reminder_time}">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-reminder-btn" data-id="${reminder.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      return li;
    }
  
    // Reset Reminder Modal on close — restore title, save button text, and hide the delete button.
    reminderModalEl.addEventListener('hidden.bs.modal', function () {
      reminderModalLabel.textContent = "Add New Reminder";
      const reminderSaveBtn = reminderModalEl.querySelector('button[type="submit"]');
      if (reminderSaveBtn) {
        reminderSaveBtn.textContent = "Create Reminder";
      }
      const modalFooter = reminderModalEl.querySelector('.modal-footer');
      let deleteBtn = modalFooter.querySelector('.delete-reminder-modal-btn');
      if (deleteBtn) {
        deleteBtn.style.display = 'none';
      }
    });
});
