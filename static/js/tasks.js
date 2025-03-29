console.log("Tasks Page JS loaded!");

document.addEventListener('DOMContentLoaded', function () {
  const filterInput = document.getElementById("task-filter");
  let allTasks = [];

  // ---- Fetch all tasks ----
  fetch(window.tasksJsonUrl)
    .then(response => response.json())
    .then(tasks => {
      console.log("Fetched tasks:", tasks);
      allTasks = tasks;
      renderTasks(allTasks);
    })
    .catch(error => {
      console.error("Error loading tasks:", error);
    });

  // ---- Filter tasks on input ----
  filterInput.addEventListener('input', function() {
    const searchTerm = filterInput.value.toLowerCase();
    const filteredTasks = allTasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm)
    );
    renderTasks(filteredTasks);
  });

  // ---- Render tasks into Completed and Incomplete Sections ----
  function renderTasks(tasks) {
    const completedList = document.getElementById("completed-tasks");
    const incompleteList = document.getElementById("incomplete-tasks");

    completedList.innerHTML = "";
    incompleteList.innerHTML = "";

    const completedTasks = tasks.filter(task => task.completed);
    const incompleteTasks = tasks.filter(task => !task.completed);

    // Render Incomplete Tasks (clickable to mark complete)
    if (incompleteTasks.length === 0) {
      incompleteList.innerHTML = "<li>No incomplete tasks.</li>";
    } else {
      incompleteTasks.forEach(task => {
        const listItem = document.createElement("li");
        listItem.textContent = `${task.title} - Due: ${new Date(task.due_date).toLocaleDateString()}`;
        listItem.style.cursor = "pointer";
        // On click, mark task as complete
        listItem.addEventListener('click', function() {
          updateTaskStatus(task.id, true);
        });
        incompleteList.appendChild(listItem);
      });
    }

    // Render Completed Tasks (clickable to mark as incomplete)
    if (completedTasks.length === 0) {
      completedList.innerHTML = "<li>No completed tasks.</li>";
    } else {
      completedTasks.forEach(task => {
        const listItem = document.createElement("li");
        listItem.textContent = `${task.title} - Due: ${new Date(task.due_date).toLocaleDateString()}`;
        listItem.style.cursor = "pointer";
        listItem.classList.add("completed-task");
        // On click, mark task as incomplete
        listItem.addEventListener('click', function() {
          updateTaskStatus(task.id, false);
        });
        completedList.appendChild(listItem);
      });
    }
  }

  // ---- Update Task Status via AJAX ----
  function updateTaskStatus(taskId, completed) {
    fetch(window.updateTaskStatusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({
        task_id: taskId,
        completed: completed
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Task updated:", data);
      // Update local tasks array and re-render
      allTasks = allTasks.map(task => {
        if (task.id == taskId) {
          task.completed = data.completed;
        }
        return task;
      });
      renderTasks(allTasks);
    })
    .catch(error => {
      console.error("Error updating task:", error);
    });
  }

  // ---- Helper for CSRF Token ----
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
