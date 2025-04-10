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