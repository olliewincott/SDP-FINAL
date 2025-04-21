console.log("📈 Wellbeing.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  const editGoalsBtn = document.getElementById('editGoalsBtn');
  const modal = document.getElementById('wellnessGoalsModal');
  const form = document.getElementById('wellnessGoalsForm');

  // Track confetti triggers persistently
  const confettiTriggered = JSON.parse(localStorage.getItem('confettiTriggered')) || {
    water: false,
    breaks: false,
    meals: false
  };

  function saveConfettiState() {
    localStorage.setItem('confettiTriggered', JSON.stringify(confettiTriggered));
  }

  function saveLevelXP(level, xp) {
    localStorage.setItem('wellnessLevel', level);
    localStorage.setItem('wellnessXP', xp);
  }

  function loadLevelXP() {
    return {
      level: parseInt(localStorage.getItem('wellnessLevel') || '1'),
      xp: parseInt(localStorage.getItem('wellnessXP') || '0')
    };
  }

  // Load saved level/xp initially
  const savedStats = loadLevelXP();
  updateLevelDisplay(savedStats.level, savedStats.xp);

  fetch(window.wellnessJsonUrl)
    .then(r => r.json())
    .then(data => {
      console.log("✅ Fetched wellness data:", data);
      updateWellnessProgress(data);

      if (data.level && data.xp !== undefined) {
        saveLevelXP(data.level, data.xp);
        updateLevelDisplay(data.level, data.xp);
      }
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
              handleLevelAndXP(freshData.level, freshData.xp);
            });
        })
        .catch(err => {
          console.error("❌ Error updating wellness:", err);
        });
    });
  });

  // Modal Handling
  if (editGoalsBtn && modal) {
    editGoalsBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    modal.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === "Escape") {
        modal.classList.add('hidden');
      }
    });
  }

  // Modal form submit
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

            confettiTriggered.water = false;
            confettiTriggered.breaks = false;
            confettiTriggered.meals = false;
            saveConfettiState();

            fetch(window.wellnessJsonUrl)
              .then(r => r.json())
              .then(freshData => {
                updateWellnessProgress(freshData);
                handleLevelAndXP(freshData.level, freshData.xp);
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

      if (!confettiTriggered[type]) {
        confettiTriggered[type] = true;
        saveConfettiState();
        if (typeof confetti === "function") {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.4 },
            colors: ['#4cd964', '#5AC8FA', '#ffcc00']
          });
        }
      }
    } else {
      wrapper.classList.remove("complete");
    }
  }

  function handleLevelAndXP(level, xp) {
    let currentLevel = parseInt(localStorage.getItem('wellnessLevel') || '1');
    let currentXP = parseInt(localStorage.getItem('wellnessXP') || '0');

    // Safety net: If backend sends new ones, update
    if (level && xp !== undefined) {
      currentLevel = level;
      currentXP = xp;
    }

    if (currentXP >= 100) {
      currentLevel++;
      currentXP = 0;

      localStorage.setItem('wellnessLevel', currentLevel);
      localStorage.setItem('wellnessXP', currentXP);

      updateLevelDisplay(currentLevel, currentXP);

      if (typeof confetti === "function") {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.3 },
          colors: ['#5AC8FA', '#4cd964', '#ffcc00', '#5856d6']
        });
      }

      setTimeout(() => {
        alert(`🎉 Congratulations! You've reached Level ${currentLevel}! 🎯`);
      }, 300);
    } else {
      saveLevelXP(currentLevel, currentXP);
      updateLevelDisplay(currentLevel, currentXP);
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