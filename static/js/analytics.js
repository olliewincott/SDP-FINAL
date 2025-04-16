// static/js/analytics.js
document.addEventListener('DOMContentLoaded', () => {
  // ---- Chart.js global defaults for dark theme ----
  Chart.defaults.color = '#d1d1d6';
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;

  // ensure each canvas’s parent has a fixed height so Chart.js can fill it
  const setCanvasHeight = (canvasId, heightPx) => {
    const canvas = document.getElementById(canvasId);
    if (canvas && canvas.parentNode) {
      canvas.parentNode.style.height = heightPx;
    }
    return canvas;
  };

  // helper to get CSRF from cookies (for any POSTs you add)
  function getCSRFToken() {
    const name = 'csrftoken';
    return document.cookie.split(';').reduce((token, c) => {
      const [k,v] = c.trim().split('=');
      return k === name ? decodeURIComponent(v) : token;
    }, '');
  }

  // ---- Monthly Completed Tasks ----
  const tasksCanvas = setCanvasHeight('tasksChart', '300px');
  if (tasksCanvas) {
    fetch(window.monthlyProductivityUrl)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          console.warn('No productivity data');
          return;
        }
        const labels = data.map(e => e.date);
        const counts = data.map(e => e.count);
        new Chart(tasksCanvas.getContext('2d'), {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Completed Tasks',
              data: counts,
              borderColor: '#5AC8FA',
              backgroundColor: 'rgba(90,200,250,0.2)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: '#5AC8FA',
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 10 },
            scales: {
              x: {
                ticks: { color: '#d1d1d6' },
                grid: { color: 'rgba(255,255,255,0.2)' }
              },
              y: {
                beginAtZero: true,
                ticks: { color: '#d1d1d6' },
                grid: { color: 'rgba(255,255,255,0.2)' }
              }
            }
          }
        });
      })
      .catch(err => {
        console.error('Error loading monthly tasks data:', err);
      });
  }

  // ---- Monthly Wellness Stats ----
  const wellnessCanvas = setCanvasHeight('wellnessChart', '300px');
  if (wellnessCanvas) {
    fetch(window.monthlyWellnessUrl)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          console.warn('No wellness data');
          return;
        }
        const labels       = data.map(e => `Month ${e.month}`);
        const avgWater     = data.map(e => e.avg_water);
        const targetWater  = data.map(e => e.target_water);
        const avgBreaks    = data.map(e => e.avg_breaks);
        const targetBreaks = data.map(e => e.target_breaks);
        const avgMeals     = data.map(e => e.avg_meals);
        const targetMeals  = data.map(e => e.target_meals);

        new Chart(wellnessCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Avg Water Intake',
                data: avgWater,
                backgroundColor: 'rgba(90,200,250,0.5)',
                borderColor: '#5AC8FA',
                borderWidth: 1
              },
              {
                label: 'Target Water Intake',
                data: targetWater,
                type: 'line',
                borderColor: '#5AC8FA',
                borderWidth: 2,
                fill: false,
                pointRadius: 3
              },
              {
                label: 'Avg Breaks',
                data: avgBreaks,
                backgroundColor: 'rgba(255,159,64,0.5)',
                borderColor: '#FF9F40',
                borderWidth: 1
              },
              {
                label: 'Target Breaks',
                data: targetBreaks,
                type: 'line',
                borderColor: '#FF9F40',
                borderWidth: 2,
                fill: false,
                pointRadius: 3
              },
              {
                label: 'Avg Meals',
                data: avgMeals,
                backgroundColor: 'rgba(75,192,192,0.5)',
                borderColor: '#4BC0C0',
                borderWidth: 1
              },
              {
                label: 'Target Meals',
                data: targetMeals,
                type: 'line',
                borderColor: '#4BC0C0',
                borderWidth: 2,
                fill: false,
                pointRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 10 },
            scales: {
              x: {
                ticks: { color: '#d1d1d6' },
                grid: { color: 'rgba(255,255,255,0.2)' }
              },
              y: {
                beginAtZero: true,
                ticks: { color: '#d1d1d6' },
                grid: { color: 'rgba(255,255,255,0.2)' }
              }
            }
          }
        });
      })
      .catch(err => {
        console.error('Error loading monthly wellness data:', err);
      });
  }
});