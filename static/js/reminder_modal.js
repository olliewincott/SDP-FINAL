document.addEventListener('DOMContentLoaded', function () {
  const reminderForm = document.getElementById('addReminderForm');
  const reminderList = document.getElementById('reminder-list');
  const reminderModalEl = document.getElementById('addReminderModal');
  const reminderModalLabel = document.getElementById('addReminderModalLabel');

  if (!reminderForm) return;

  // Handle reminder form submission (create or update)
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
        // Instead of rebuilding the whole list item, update the existing one in place.
        const li = reminderList.querySelector(`[data-reminder-id="${data.reminder.id}"]`);
        if (li) {
          // Update the event title (from the select element)
          const titleSpan = li.querySelector('span.font-weight-semibold');
          if (titleSpan) {
            const eventSelect = document.getElementById('reminder-event');
            if (eventSelect && eventSelect.selectedIndex >= 0) {
              titleSpan.textContent = eventSelect.options[eventSelect.selectedIndex].text;
            }
          }
          // Update the reminder time display.
          const timeSmall = li.querySelector('small.text-muted');
          if (timeSmall) {
            timeSmall.textContent = new Date(data.reminder.reminder_time).toLocaleString("en-US", {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric'
            });
          }
        } else {
          // Fallback: if no list item is found, append the new item.
          const newLi = buildReminderListItem(data.reminder);
          reminderList.insertAdjacentHTML('beforeend', newLi);
        }
        bootstrap.Modal.getInstance(reminderModalEl).hide();
        reminderForm.reset();
        reminderForm.removeAttribute('data-editing');
      } else {
        alert(data.error || 'Failed to save reminder.');
      }
    })
    .catch(() => alert("Error saving reminder. Check server."));
  });

  // Handle reminder list click events (delete and edit)
  reminderList.addEventListener('click', function (e) {
    const button = e.target.closest('button');
    if (!button) return;
    const reminderId = button.dataset.id;
    
    if (button.classList.contains('delete-reminder-btn')) {
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
      .catch(() => alert('Failed to delete reminder.'));
    }
    
    if (button.classList.contains('edit-reminder-btn')) {
      reminderModalLabel.textContent = "Update Reminder";
      const reminderSaveBtn = reminderModalEl.querySelector('button[type="submit"]');
      if (reminderSaveBtn) { reminderSaveBtn.textContent = "Update Reminder"; }
      
      // Add or show the delete button in the modal footer.
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
            headers: { 'X-CSRFToken': window.getCSRFToken() }
          })
          .then(res => res.json())
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
          .catch(() => alert("Error deleting reminder."));
        }
      };
      
      // Populate modal form fields with existing reminder data.
      if (document.getElementById('reminder-title')) {
        document.getElementById('reminder-title').value = button.dataset.title;
      }
      document.getElementById('reminder-event').value = button.dataset.eventId;
      document.getElementById('reminder-time').value = button.dataset.time;
      reminderForm.dataset.editing = reminderId;
      
      // Show the modal reliably using getOrCreateInstance.
      bootstrap.Modal.getOrCreateInstance(reminderModalEl).show();
    }
  });

  // Helper function if you need to create a new list item.
  function buildReminderListItem(reminder) {
    return `
      <li class="list-group-item reminder-item d-flex justify-content-between align-items-center bg-dark text-light border-0 rounded mb-2 shadow-sm px-3 py-2" data-reminder-id="${reminder.id}">
        <div class="d-flex align-items-center">
          <i class="fas fa-bell mr-2 text-info reminder-icon"></i>
          <span class="font-weight-semibold">${reminder.title}</span>
        </div>
        <div class="d-flex align-items-center gap-3">
          <small class="text-muted me-2">${new Date(reminder.reminder_time).toLocaleString("en-US", {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          })}</small>
          <div class="reminder-controls d-flex gap-2">
            <button class="btn btn-sm text-light edit-reminder-btn" 
                    data-id="${reminder.id}"
                    data-title="${reminder.title}"
                    data-event-id="${reminder.event_id}"
                    data-time="${new Date(reminder.reminder_time).toISOString().slice(0,16)}"
                    title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm text-light delete-reminder-btn" 
                    data-id="${reminder.id}" title="Delete">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </li>
    `;
  }

  reminderModalEl.addEventListener('hidden.bs.modal', function () {
    reminderModalLabel.textContent = "Add New Reminder";
    const reminderSaveBtn = reminderModalEl.querySelector('button[type="submit"]');
    if (reminderSaveBtn) { reminderSaveBtn.textContent = "Create Reminder"; }
    const modalFooter = reminderModalEl.querySelector('.modal-footer');
    let deleteBtn = modalFooter.querySelector('.delete-reminder-modal-btn');
    if (deleteBtn) { deleteBtn.style.display = 'none'; }
  });
});
