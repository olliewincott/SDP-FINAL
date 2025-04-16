console.log("📈 Wellbeing.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  const editGoalsBtn = document.getElementById('editGoalsBtn');
  const modal = document.getElementById('wellnessGoalsModal');
  const form = document.getElementById('wellnessGoalsForm');

  // Fetch wellness data on load
  fetch(window.wellnessJsonUrl)
    .then(r => r.json())
    .then(data => {
      console.log("✅ Fetched wellness data:", data);
      updateWellnessProgress(data);
      updateLevelDisplay(data.level, data.xp);
    })
    .catch(err => {
      console.error("❌ Error fetching wellness data:", err);
    });

  // Handle card clicks
  document.querySelectorAll('.wellness-card').forEach(card => {
    card.addEventListener('click', () => {
      const statType = card.dataset.type;

      fetch(window.incrementWellnessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ metric: statType })
      })
        .then(r => r.json())
        .then(data => {
          console.log("✅ Wellness updated:", data);
          fetch(window.wellnessJsonUrl)
            .then(r => r.json())
            .then(freshData => {
              updateWellnessProgress(freshData);
              updateLevelDisplay(data.level, data.xp);

              if (data.leveled_up && typeof confetti === "function") {
                confetti({
                  particleCount: 150,
                  spread: 80,
                  origin: { y: 0.3 },
                  colors: ['#4cd964', '#5AC8FA', '#ffcc00', '#5856d6']
                });
              }
            });
        })
        .catch(err => {
          console.error("❌ Error updating wellness:", err);
        });
    });
  });

  // Show modal
  if (editGoalsBtn && modal) {
    editGoalsBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    modal.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    });

    // ESC key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === "Escape") {
        modal.classList.add('hidden');
      }
    });
  }

  // Submit modal form
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const formData = new FormData(form);

      fetch(window.updateWellnessGoalsUrl, {
        method: 'POST',
        headers: {
          'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new URLSearchParams(formData)
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            console.log("✅ Goals updated:", data);
            modal.classList.add('hidden');

            // Refresh progress
            fetch(window.wellnessJsonUrl)
              .then(r => r.json())
              .then(freshData => {
                updateWellnessProgress(freshData);
                updateLevelDisplay(freshData.level, freshData.xp);
              });
          } else {
            alert("❌ Failed to save goals.");
          }
        })
        .catch(() => {
          alert("❌ Server error saving goals.");
        });
    });
  }

  function updateWellnessProgress(data) {
    animateRingProgress("water", data.water_intake, data.water_goal);
    animateRingProgress("breaks", data.movement_breaks, data.breaks_goal);
    animateRingProgress("meals", data.healthy_meals, data.meals_goal);
  }

  function animateRingProgress(type, current, goal) {
    const percent = Math.min((current / goal) * 100, 100);
    const ring = document.querySelector(`.wellness-card[data-type="${type}"] .progress`);
    const wrapper = ring.closest('.progress-ring');
    const label = document.getElementById(`${type}-progress`);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = circumference;

    const offset = circumference - (percent / 100) * circumference;
    ring.style.strokeDashoffset = offset;

    if (label) {
      label.textContent = `${current}/${goal}`;
    }

    if (percent === 100) {
      wrapper.classList.add("complete");
      if (typeof confetti === "function") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.4 },
          colors: ['#4cd964', '#5AC8FA', '#ffcc00']
        });
      }
    } else {
      wrapper.classList.remove("complete");
    }
  }

  function updateLevelDisplay(level, xp) {
    const levelBadge = document.getElementById('wellness-level');
    const xpBar = document.getElementById('xp-bar');
    if (levelBadge) levelBadge.textContent = `Level ${level}`;
    if (xpBar) xpBar.style.width = `${(xp / 100) * 100}%`;
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