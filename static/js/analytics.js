document.addEventListener('DOMContentLoaded', function () {
    // ---- Tasks Graph: Monthly Completed Tasks ----
    const tasksChartCanvas = document.getElementById('tasksChart');
    if (tasksChartCanvas) {
      fetch(window.monthlyProductivityUrl)
        .then(response => response.json())
        .then(data => {
          console.log("Monthly tasks data:", data);
          // Assuming data items have: date and count (completed tasks count)
          const labels = data.map(entry => entry.date);
          const counts = data.map(entry => entry.count);
    
          const ctx = tasksChartCanvas.getContext('2d');
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Completed Tasks',
                data: counts,
                borderColor: 'rgba(0, 122, 255, 1)',
                backgroundColor: 'rgba(0, 122, 255, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(0, 122, 255, 1)',
                fill: true
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: 10 },
              plugins: {
                legend: {
                  display: true,
                  labels: { color: "#d1d1d6" }
                }
              },
              scales: {
                x: {
                  ticks: { color: "#d1d1d6" },
                  grid: { color: "rgba(255, 255, 255, 0.2)" }
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#d1d1d6" },
                  grid: { color: "rgba(255, 255, 255, 0.2)" }
                }
              }
            }
          });
        })
        .catch(error => console.error("Error loading monthly tasks data:", error));
    }
  
    // ---- Wellness Graph: Monthly Wellness Stats ----
    const wellnessChartCanvas = document.getElementById('wellnessChart');
    if (wellnessChartCanvas) {
      fetch(window.monthlyWellnessUrl)
        .then(response => response.json())
        .then(data => {
          console.log("Monthly wellness data:", data);
          // Assuming each data item has:
          // month, avg_water, avg_breaks, avg_meals, target_water, target_breaks, target_meals
          const labels = data.map(entry => `Month ${entry.month}`);
          const avgWater = data.map(entry => entry.avg_water);
          const avgBreaks = data.map(entry => entry.avg_breaks);
          const avgMeals = data.map(entry => entry.avg_meals);
          const targetWater = data.map(entry => entry.target_water);
          const targetBreaks = data.map(entry => entry.target_breaks);
          const targetMeals = data.map(entry => entry.target_meals);
    
          const ctx = wellnessChartCanvas.getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Avg Water Intake',
                  data: avgWater,
                  backgroundColor: 'rgba(0, 122, 255, 0.5)',
                  borderColor: 'rgba(0, 122, 255, 1)',
                  borderWidth: 1
                },
                {
                  label: 'Target Water Intake',
                  data: targetWater,
                  type: 'line',
                  backgroundColor: 'rgba(0, 122, 255, 0.2)',
                  borderColor: 'rgba(0, 122, 255, 1)',
                  borderWidth: 2,
                  fill: false
                },
                {
                  label: 'Avg Breaks',
                  data: avgBreaks,
                  backgroundColor: 'rgba(255, 159, 64, 0.5)',
                  borderColor: 'rgba(255, 159, 64, 1)',
                  borderWidth: 1
                },
                {
                  label: 'Target Breaks',
                  data: targetBreaks,
                  type: 'line',
                  backgroundColor: 'rgba(255, 159, 64, 0.2)',
                  borderColor: 'rgba(255, 159, 64, 1)',
                  borderWidth: 2,
                  fill: false
                },
                {
                  label: 'Avg Meals',
                  data: avgMeals,
                  backgroundColor: 'rgba(75, 192, 192, 0.5)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1
                },
                {
                  label: 'Target Meals',
                  data: targetMeals,
                  type: 'line',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 2,
                  fill: false
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: 10 },
              plugins: {
                legend: {
                  display: true,
                  labels: { color: "#d1d1d6" }
                }
              },
              scales: {
                x: {
                  ticks: { color: "#d1d1d6" },
                  grid: { color: "rgba(255, 255, 255, 0.2)" }
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#d1d1d6" },
                  grid: { color: "rgba(255, 255, 255, 0.2)" }
                }
              }
            }
          });
        })
        .catch(error => console.error("Error loading monthly wellness data:", error));
    }
  });
  