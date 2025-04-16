document.addEventListener('DOMContentLoaded', function () {
  const reminderForm = document.getElementById('addReminderForm');
  const reminderList = document.getElementById('reminder-list');
  const reminderModalEl = document.getElementById('addReminderModal');
  const reminderModalLabel = document.getElementById('addReminderModalLabel');

  if (!reminderForm) return;

  // Form submit (add/update reminder)
  reminderForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(reminderForm);
    const editingId = reminderForm.dataset.editing;
    const url = editingId ? `/edit_reminder/${editingId}/` : '/add_reminder/';

    fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': window.getCSRFToken() },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.reminder) {
        const li = reminderList.querySelector(`[data-reminder-id="${data.reminder.id}"]`);

        if (li) {
          li.querySelector('p.text-sm').innerHTML = `
            <i class="fas fa-bell text-yellow-400 mr-1"></i>
            ${data.reminder.title}
          `;
          li.querySelector('p.text-xs').textContent = new Date(data.reminder.reminder_time).toLocaleString();
        } else {
          reminderList.insertAdjacentHTML('beforeend', buildReminderListItem(data.reminder));
        }

        bootstrap.Modal.getOrCreateInstance(reminderModalEl).hide();
        reminderForm.reset();
        reminderForm.removeAttribute('data-editing');
      } else {
        alert(data.error || 'Failed to save reminder.');
      }
    })
    .catch(() => alert("Error saving reminder."));
  });

  // Edit/Delete click handling
  reminderList.addEventListener('click', function (e) {
    const button = e.target.closest('button');
    if (!button) return;
    const reminderId = button.dataset.id;

    // Delete Reminder
    if (button.classList.contains('delete-reminder-btn')) {
      if (confirm("Delete this reminder?")) {
        fetch(`/delete_reminder/${reminderId}/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': window.getCSRFToken() }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const li = reminderList.querySelector(`[data-reminder-id="${reminderId}"]`);
            if (li) li.remove();
          } else {
            alert(data.error || 'Delete failed.');
          }
        })
        .catch(() => alert("Error deleting reminder."));
      }
    }

    // Edit Reminder
    if (button.classList.contains('edit-reminder-btn')) {
      reminderModalLabel.textContent = "Update Reminder";
      const saveBtn = reminderModalEl.querySelector('button[type="submit"]');
      if (saveBtn) saveBtn.textContent = "Update Reminder";

      // Show or create delete button in modal
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
          fetch(`/delete_reminder/${reminderId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': window.getCSRFToken() }
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              bootstrap.Modal.getInstance(reminderModalEl).hide();
              reminderForm.reset();
              reminderForm.removeAttribute('data-editing');
              const li = reminderList.querySelector(`[data-reminder-id="${reminderId}"]`);
              if (li) li.remove();
            } else {
              alert(data.error || "Delete failed");
            }
          })
          .catch(() => alert("Error deleting reminder."));
        }
      };

      // Populate form values
      reminderForm.dataset.editing = reminderId;
      document.getElementById('reminder-event').value = button.dataset.eventId;
      document.getElementById('reminder-time').value = button.dataset.time;
      bootstrap.Modal.getOrCreateInstance(reminderModalEl).show();
    }
  });

  // Helper to create a reminder item (if needed)
  function buildReminderListItem(reminder) {
    return `
      <li class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex justify-between items-center"
          data-reminder-id="${reminder.id}">
        <div>
          <p class="text-sm font-medium text-gray-800 mb-1">
            <i class="fas fa-bell text-yellow-400 mr-1"></i>
            ${reminder.title}
          </p>
          <p class="text-xs text-gray-500">
            ${new Date(reminder.reminder_time).toLocaleString()}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button class="text-indigo-600 hover:text-indigo-800 text-sm edit-reminder-btn"
                  title="Edit"
                  data-id="${reminder.id}"
                  data-title="${reminder.title}"
                  data-time="${new Date(reminder.reminder_time).toISOString().slice(0, 16)}"
                  data-event-id="${reminder.event_id}">
            <i class="fas fa-pen"></i>
          </button>
          <button class="text-red-500 hover:text-red-700 text-sm delete-reminder-btn"
                  title="Delete"
                  data-id="${reminder.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </li>
    `;
  }

  // Reset modal on close
  reminderModalEl.addEventListener('hidden.bs.modal', function () {
    reminderModalLabel.textContent = "Add New Reminder";
    const saveBtn = reminderModalEl.querySelector('button[type="submit"]');
    if (saveBtn) saveBtn.textContent = "Create Reminder";
    const deleteBtn = reminderModalEl.querySelector('.delete-reminder-modal-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';
  });
});