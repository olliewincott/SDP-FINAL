console.log("Dashboard JS loaded!");

// DEBUGGING: Detect any usage of eval() or new Function()
(function() {
  const originalEval = window.eval;
  window.eval = function() {
    console.warn("⚠️ eval() was called with arguments:", arguments);
    debugger;
    return originalEval.apply(this, arguments);
  };

  const originalFunction = Function;
  window.Function = function() {
    console.warn("⚠️ new Function() was called with arguments:", arguments);
    debugger;
    return originalFunction.apply(this, arguments);
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  console.log("Tasks URL:", window.tasksJsonUrl);
  console.log("Wellness URL:", window.wellnessJsonUrl);
  console.log("Increment Wellness URL:", window.incrementWellnessUrl);
  console.log("Update Task URL:", window.updateTaskStatusUrl);

  // ---- Load Today's Tasks (Click-to-complete) ----
  fetch(window.tasksJsonUrl)
    .then(r => r.json())
    .then(tasks => {
      console.log("Fetched tasks:", tasks);
      const todayStr = new Date().toLocaleDateString('en-CA');
      console.log("Today (local):", todayStr);

      const taskList = document.getElementById("task-list");
      if (!taskList) return;

      const todaysTasks = tasks.filter(t => {
        const dueDateStr = new Date(t.due_date).toLocaleDateString('en-CA');
        return dueDateStr === todayStr;
      });

      taskList.innerHTML = "";
      if (todaysTasks.length === 0) {
        taskList.innerHTML = "<li>No tasks for today.</li>";
      } else {
        todaysTasks.forEach(t => {
          const li = document.createElement("li");
          li.textContent = `${t.title} - Due: ${new Date(t.due_date).toLocaleDateString()}`;
          li.style.cursor = "pointer";

          if (t.completed) {
            li.classList.add("completed-task");
          }

          li.addEventListener('click', function () {
            const newStatus = !t.completed;
            updateTaskStatus(t.id, newStatus, function(updatedTask) {
              t.completed = updatedTask.completed;
              if (t.completed) {
                li.classList.add("completed-task");
              } else {
                li.classList.remove("completed-task");
              }
            });
          });

          taskList.appendChild(li);
        });
      }
    })
    .catch(err => {
      console.error("Error fetching tasks:", err);
      const taskList = document.getElementById("task-list");
      if (taskList) {
        taskList.innerHTML = "<li>Error loading tasks.</li>";
      }
    });

  // ---- Load Wellness Stats ----
  fetch(window.wellnessJsonUrl)
    .then(r => r.json())
    .then(data => {
      console.log("Fetched wellness data:", data);
      updateWellnessProgress(data);
    })
    .catch(err => {
      console.error("Error fetching wellness data:", err);
    });

  // ---- Clickable Wellness Widgets ----
  document.querySelectorAll('.wellness-widget').forEach(widget => {
    widget.addEventListener('click', () => {
      const statType = widget.dataset.type;
      fetch(window.incrementWellnessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': getCSRFToken()
        },
        body: `type=${statType}`
      })
        .then(r => r.json())
        .then(data => {
          console.log("Wellness updated:", data);
          updateWellnessProgress(data);
        })
        .catch(err => console.error("Error updating wellness:", err));
    });
  });

  // ---- Helper Functions ----
  function updateWellnessProgress(data) {
    const waterPercent = Math.min((data.water_intake / 8) * 100, 100);
    const breaksPercent = Math.min((data.movement_breaks / 3) * 100, 100);
    const mealsPercent = Math.min((data.healthy_meals / 3) * 100, 100);

    document.getElementById("water-progress").textContent = `${Math.round(waterPercent)}%`;
    document.getElementById("breaks-progress").textContent = `${Math.round(breaksPercent)}%`;
    document.getElementById("meals-progress").textContent = `${Math.round(mealsPercent)}%`;
  }

  function updateTaskStatus(taskId, completed, callback) {
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
      callback(data);
    })
    .catch(error => {
      console.error("Error updating task:", error);
    });
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

// ---- Chatbot Modal Toggle Logic ----
document.addEventListener('DOMContentLoaded', function() {
  const chatButton = document.getElementById('chatbot-button');
  const chatModal = document.getElementById('chatbot-modal');
  const closeChat = document.getElementById('close-chatbot');

  if (!chatButton || !chatModal || !closeChat) {
    console.error("Chatbot elements not found in DOM.");
    return;
  }

  chatButton.addEventListener('click', function() {
    console.log("Chatbot button clicked.");
    chatModal.style.display = 'block';
  });

  closeChat.addEventListener('click', function() {
    console.log("Chatbot close button clicked.");
    chatModal.style.display = 'none';
  });

  window.addEventListener('click', function(event) {
    if (event.target === chatModal) {
      console.log("Clicked outside chatbot content, hiding modal.");
      chatModal.style.display = 'none';
    }
  });
});
