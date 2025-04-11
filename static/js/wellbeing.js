console.log("📈 Wellbeing.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  // ---- Load Wellness Stats on Page Load ----
  fetch(window.wellnessJsonUrl)
    .then(r => r.json())
    .then(data => {
      console.log("✅ Fetched wellness data:", data);
      updateWellnessProgress(data);
    })
    .catch(err => {
      console.error("❌ Error fetching wellness data:", err);
    });

  // ---- Make Wellness Widgets Clickable ----
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

  // ---- Update UI Progress ----
  function updateWellnessProgress(data) {
    const waterPercent = Math.min((data.water_intake / 8) * 100, 100);
    const breaksPercent = Math.min((data.movement_breaks / 3) * 100, 100);
    const mealsPercent = Math.min((data.healthy_meals / 3) * 100, 100);

    document.getElementById("water-progress").textContent = `${Math.round(waterPercent)}%`;
    document.getElementById("breaks-progress").textContent = `${Math.round(breaksPercent)}%`;
    document.getElementById("meals-progress").textContent = `${Math.round(mealsPercent)}%`;
  }

  // ---- CSRF Helper ----
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
