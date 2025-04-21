console.log("Tasks Page JS loaded!");

document.addEventListener('DOMContentLoaded', () => {
  window.getCSRFToken = () => 
    document.cookie.split(';').reduce((t,c) => {
      const [k,v] = c.trim().split('=');
      return k==='csrftoken' ? decodeURIComponent(v) : t;
    }, '');

  const filterInput = document.getElementById('task-filter');
  const sortSelect  = document.getElementById('task-sort'); // 🆕
  const modal       = document.getElementById('addTaskModal');
  const form        = document.getElementById('addTaskForm');
  const saveBtn     = document.getElementById('saveTaskBtn');
  const modalLabel  = document.getElementById('addTaskModalLabel');
  let allTasks = [];

  // --- Fetch & render tasks ---
  function fetchTasks() {
    fetch(window.tasksJsonUrl)
      .then(r => r.json())
      .then(ts => { 
        allTasks = ts; 
        renderTasks(ts); 
      })
      .catch(e => console.error('Error loading tasks:', e));
  }
  fetchTasks();

  // --- Render tasks list ---
  function renderTasks(tasks) {
    const filterTerm = filterInput.value.toLowerCase();
    let filtered = tasks.filter(t => t.title.toLowerCase().includes(filterTerm));

    const sortOrder = sortSelect?.value;
    if (sortOrder === 'asc') {
      filtered = filtered.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    } else if (sortOrder === 'desc') {
      filtered = filtered.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
    }

    ['incomplete', 'completed'].forEach(sec => {
      const ul = document.getElementById(`${sec}-tasks`);
      ul.innerHTML = '';
    });

    filtered.filter(t => !t.completed).forEach(t => addItem(t, false));
    filtered.filter(t => t.completed).forEach(t => addItem(t, true));

    function addItem(task, done) {
      const ul = document.getElementById(done ? 'completed-tasks' : 'incomplete-tasks');
      const li = document.createElement('li');
      li.className = [
        'bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm flex justify-between items-center text-sm transition hover:shadow-md',
        done ? 'line-through opacity-60 cursor-pointer' : 'cursor-pointer'
      ].join(' ');
      li.addEventListener('click', e => {
        if (!e.target.closest('.edit-task-btn') && !e.target.closest('.delete-task-btn')) {
          toggleStatus(task.id, !done);
        }
      });

      const span = document.createElement('span');
      span.textContent = `${task.title} — Due: ${new Date(task.due_date).toLocaleDateString()}`;
      span.className = 'font-medium text-gray-800';

      const ctrls = document.createElement('div');
      ctrls.className = 'flex items-center gap-3';

      const editBtn = document.createElement('button');
      editBtn.innerHTML = '<i class="fas fa-pen text-indigo-600 hover:text-indigo-800"></i>';
      editBtn.className = 'edit-task-btn hidden';
      Object.assign(editBtn.dataset, {
        id: task.id, title: task.title,
        description: task.description || '', duedate: task.due_date
      });

      const delBtn = document.createElement('button');
      delBtn.innerHTML = '<i class="fas fa-trash-alt text-red-500 hover:text-red-700"></i>';
      delBtn.className = 'delete-task-btn hidden';
      delBtn.dataset.id = task.id;

      ctrls.append(editBtn, delBtn);
      li.append(span, ctrls);
      ul.appendChild(li);
    }

    if (!document.getElementById('incomplete-tasks').children.length) {
      document.getElementById('incomplete-tasks').innerHTML = '<li class="text-sm text-gray-500">No incomplete tasks.</li>';
    }
    if (!document.getElementById('completed-tasks').children.length) {
      document.getElementById('completed-tasks').innerHTML = '<li class="text-sm text-gray-500">No completed tasks.</li>';
    }
  }

  // --- Toggle complete/incomplete status ---
  function toggleStatus(id, completed) {
    fetch(window.updateTaskStatusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.getCSRFToken() },
      body: JSON.stringify({ task_id: id, completed })
    })
    .then(r => r.json())
    .then(() => fetchTasks())
    .catch(e => console.error('Error updating task:', e));
  }

  // --- Live search ---
  filterInput.addEventListener('input', () => renderTasks(allTasks));

  // --- Sort select ---
  sortSelect?.addEventListener('change', () => renderTasks(allTasks));

  // --- Show Add Task Modal ---
  document.querySelectorAll('[data-action="add-task"]').forEach(btn => {
    btn.addEventListener('click', () => {
      form.reset();
      form.removeAttribute('data-editing');
      modalLabel.textContent = 'Add New Task';
      saveBtn.textContent    = 'Create Task';
      modal.classList.remove('hidden');
      document.querySelectorAll('[data-dropdown-menu="task"]').forEach(m => m.classList.add('hidden'));
    });
  });

  // --- Toggle edit/delete icons visibility ---
  document.querySelectorAll('[data-action="toggle-task-edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.edit-task-btn, .delete-task-btn')
        .forEach(el => el.classList.toggle('hidden'));
      document.querySelectorAll('[data-dropdown-menu="task"]').forEach(m => m.classList.add('hidden'));
    });
  });

  // --- Edit or Delete individual Task ---
  document.addEventListener('click', e => {
    const et = e.target.closest('.edit-task-btn');
    if (et) {
      form.dataset.editing = et.dataset.id;
      form.querySelector('#task-title').value       = et.dataset.title;
      form.querySelector('#task-description').value = et.dataset.description;
      form.querySelector('#task-due-date').value    = new Date(et.dataset.duedate).toISOString().slice(0, 16);
      modalLabel.textContent = 'Update Task';
      saveBtn.textContent    = 'Update Task';
      modal.classList.remove('hidden');
    }
    const dt = e.target.closest('.delete-task-btn');
    if (dt && confirm('Delete this task?')) {
      toggleStatus(dt.dataset.id, false);
    }
  });

  // --- Modal close ---
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => modal.classList.add('hidden'));
  });

  // --- Submit form (create or update) ---
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const edit = form.dataset.editing;
    if (edit) fd.append('id', edit);

    fetch(window.createTaskUrl, {
      method: 'POST',
      headers: { 'X-CSRFToken': window.getCSRFToken() },
      body: fd
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        modal.classList.add('hidden');
        form.reset();
        form.removeAttribute('data-editing');
        fetchTasks();
      } else {
        alert(data.error || 'Could not save task.');
      }
    })
    .catch(() => alert('Server error'));
  });

  // --- Handle dropdown open/close
  document.querySelectorAll('[data-dropdown-btn]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('[data-dropdown-menu]').forEach(m => m.classList.add('hidden'));
      const m = document.querySelector(`[data-dropdown-menu="${btn.getAttribute('data-dropdown-btn')}"]`);
      m?.classList.toggle('hidden');
    });
  });
  document.addEventListener('click', () => 
    document.querySelectorAll('[data-dropdown-menu]').forEach(m => m.classList.add('hidden'))
  );
});