
document.addEventListener('DOMContentLoaded', function () {
  const taskForm = document.getElementById('addTaskForm');
  const taskList = document.getElementById('task-list');
  const taskModalEl = document.getElementById('addTaskModal');
  const taskModalLabel = document.getElementById('addTaskModalLabel');

  if (!taskForm) return;

  taskForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(taskForm);
    const editingId = taskForm.dataset.editing;
    const url = editingId ? `/edit_task/${editingId}/` : '/add_task/';

    fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': window.getCSRFToken() },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.task) {
        taskModalEl.classList.add('hidden');
        taskForm.reset();
        taskForm.removeAttribute('data-editing');

        const li = taskList.querySelector(`[data-task-id="${data.task.id}"]`);
        if (li) {
          const titleSpan = li.querySelector('.task-title');
          if (titleSpan) {
            titleSpan.textContent = `${data.task.title} - ${new Date(data.task.due_date).toLocaleString()}`;
          } else {
            li.firstElementChild.textContent = `${data.task.title} - ${new Date(data.task.due_date).toLocaleString()}`;
          }
        } else {
          const newLi = buildTaskListItem(data.task);
          taskList.insertAdjacentHTML('beforeend', newLi);
        }
      } else {
        alert(data.error || 'Failed to save task.');
      }
    })
    .catch(() => alert("Error saving task. Check server."));
  });

  taskList.addEventListener('click', function (e) {
    const button = e.target.closest('button');
    if (!button) return;
    const taskId = button.dataset.id;

    if (button.classList.contains('delete-task-btn')) {
      if (confirm("Delete this task?")) {
        fetch(`/delete_task/${taskId}/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': window.getCSRFToken() }
        })
        .then(res => res.json())
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
        .catch(() => alert('Failed to delete task.'));
      }
    }

    if (button.classList.contains('edit-task-btn')) {
      taskModalEl.classList.remove('hidden');

      setTimeout(() => {
        taskModalLabel.textContent = "Update Task";
        const taskSaveBtn = taskModalEl.querySelector('button[type="submit"]');
        if (taskSaveBtn) taskSaveBtn.textContent = "Update Task";

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
          const editingId = taskForm.dataset.editing;
          if (confirm("Delete this task?")) {
            fetch(`/delete_task/${editingId}/`, {
              method: 'POST',
              headers: { 'X-CSRFToken': window.getCSRFToken() }
            })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                taskModalEl.classList.add('hidden');
                taskForm.reset();
                taskForm.removeAttribute('data-editing');
                const li = taskList.querySelector(`[data-task-id="${editingId}"]`);
                if (li) li.remove();
              } else {
                alert(data.error || "Delete failed");
              }
            })
            .catch(() => alert("Error deleting task."));
          }
        };

        document.getElementById('task-title').value = button.dataset.title;
        document.getElementById('task-description').value = button.dataset.description || '';
        document.getElementById('task-due-date').value = new Date(button.dataset.dueDate).toISOString().slice(0,16);
        taskForm.dataset.editing = taskId;
      }, 50);
    }
  });

  function buildTaskListItem(task) {
    return `
      <li data-task-id="${task.id}" class="list-group-item d-flex justify-content-between align-items-center bg-dark text-light mb-2 rounded shadow-sm px-3 py-2">
        <span class="task-title">${task.title} - ${new Date(task.due_date).toLocaleString()}</span>
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
      </li>
    `;
  }

  taskModalEl.addEventListener('hidden.bs.modal', function () {
    taskModalLabel.textContent = "Add New Task";
    const taskSaveBtn = taskModalEl.querySelector('button[type="submit"]');
    if (taskSaveBtn) { taskSaveBtn.textContent = "Create Task"; }
    const modalFooter = taskModalEl.querySelector('.modal-footer');
    let deleteBtn = modalFooter.querySelector('.delete-task-modal-btn');
    if (deleteBtn) { deleteBtn.style.display = 'none'; }
  });
});
