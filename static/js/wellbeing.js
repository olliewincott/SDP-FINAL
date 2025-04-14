
console.log("📈 Wellbeing.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  fetch(window.wellnessJsonUrl)
    .then(r => r.json())
    .then(data => {
      console.log("✅ Fetched wellness data:", data);
      updateWellnessProgress(data);
    })
    .catch(err => {
      console.error("❌ Error fetching wellness data:", err);
    });

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
          console.log("✅ Wellness updated:", data);
          updateWellnessProgress(data);
        })
        .catch(err => {
          console.error("❌ Error updating wellness:", err);
        });
    });
  });

  function updateWellnessProgress(data) {
    const waterPercent = Math.min((data.water_intake / 8) * 100, 100);
    const breaksPercent = Math.min((data.movement_breaks / 3) * 100, 100);
    const mealsPercent = Math.min((data.healthy_meals / 3) * 100, 100);

    setStat("water", waterPercent);
    setStat("breaks", breaksPercent);
    setStat("meals", mealsPercent);
  }

  function setStat(type, percent) {
    const progressEl = document.getElementById(`${type}-progress`);
    progressEl.textContent = `${Math.round(percent)}%`;

    if (percent === 100 && typeof confetti === "function") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.4 },
        colors: ['#4cd964', '#5AC8FA', '#ffcc00']
      });
    }
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
