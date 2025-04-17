// static/js/analytics.js
document.addEventListener('DOMContentLoaded', () => {
  //
  // 1) Dynamically size the chart containers
  //
  const chartHeight = Math.floor(window.innerHeight * 0.47); // ~47% of viewport each
  ['tasksChart', 'wellnessChart'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentNode) {
      el.parentNode.style.height = `${chartHeight}px`;
    }
  });

  //
  // 2) Helper to fetch & parse JSON
  //
  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} from ${url}: ${txt}`);
    }
    return res.json();
  }

  //
  // 3) Shared styling for axes/grid/tooltips
  //
  const axisStyle = {
    labels:     { style: { colors: '#d1d1d6', fontSize: '12px' } },
    axisBorder: { show: true, color: 'rgba(255,255,255,0.2)' },
    axisTicks:  { show: true, color: 'rgba(255,255,255,0.2)' }
  };

  //
  // 4) Monthly Completed Tasks (Line)
  //
  async function drawTasksChart() {
    let data;
    try {
      data = await fetchJson(window.monthlyProductivityUrl);
    } catch (err) {
      console.error('Tasks fetch error:', err);
      return;
    }
    if (!Array.isArray(data) || !data.length) return;

    const dates  = data.map(e => e.date);
    const counts = data.map(e => e.count);

    new ApexCharts(
      document.querySelector('#tasksChart'),
      {
        chart: {
          type:       'line',
          height:     '100%',
          background: 'transparent',
          toolbar:    { show: false },
          zoom:       { enabled: false },
          animations: { enabled: true, easing: 'easeout', speed: 500 }
        },
        series: [{ name: 'Completed Tasks', data: counts }],
        colors: ['#5AC8FA'],
        stroke: { curve: 'smooth', width: 3 },
        markers: { size: 5, hover: { size: 7 } },
        grid:    { borderColor: 'rgba(255,255,255,0.1)', strokeDashArray: 4 },
        xaxis: {
          categories: dates,
          tickAmount: Math.min(7, dates.length),
          labels:     { rotate: -45, rotateAlways: true, ...axisStyle.labels },
          axisBorder: axisStyle.axisBorder,
          axisTicks:  axisStyle.axisTicks
        },
        yaxis: {
          min:        0,
          tickAmount: 5,
          labels:     axisStyle.labels,
          axisBorder: axisStyle.axisBorder,
          axisTicks:  axisStyle.axisTicks
        },
        tooltip: {
          theme: 'dark',
          x:     { format: 'MMM dd' },
          style: { fontSize: '13px' }
        },
        dataLabels: { enabled: false },
        legend:     { show: false }
      }
    ).render();
  }

  //
  // 5) Monthly Wellness Stats (Line chart with rounded values)
  //
  async function drawWellnessChart() {
    let data;
    try {
      data = await fetchJson(window.monthlyWellnessUrl);
    } catch (err) {
      console.error('Wellness fetch error:', err);
      return;
    }
    if (!Array.isArray(data) || !data.length) return;

    // Convert month numbers to short names
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const categories = data.map(e => monthNames[e.month - 1] || `M${e.month}`);

    // Series of actual averages
    const hydration = data.map(e => e.avg_water);
    const breaks    = data.map(e => e.avg_breaks);
    const meals     = data.map(e => e.avg_meals);

    new ApexCharts(
      document.querySelector('#wellnessChart'),
      {
        chart: {
          type:       'line',
          height:     '100%',
          background: 'transparent',
          toolbar:    { show: false },
          zoom:       { enabled: false },
          animations: { enabled: true, easing: 'easeout', speed: 500 }
        },
        series: [
          { name: 'Water Intake', data: hydration },
          { name: 'Breaks Taken',  data: breaks    },
          { name: 'Meals Eaten',   data: meals     }
        ],
        colors: ['#5AC8FA','#FF9F40','#4BC0C0'],
        stroke: { curve: 'smooth', width: 3 },
        markers: { size: 5, hover: { size: 7 } },
        grid:    { borderColor: 'rgba(255,255,255,0.1)', strokeDashArray: 4 },
        xaxis: {
          categories,
          labels:     axisStyle.labels,
          axisBorder: axisStyle.axisBorder,
          axisTicks:  axisStyle.axisTicks
        },
        yaxis: {
          beginAtZero: true,
          labels: {
            ...axisStyle.labels,
            formatter: val => val.toFixed(1)
          },
          axisBorder: axisStyle.axisBorder,
          axisTicks:  axisStyle.axisTicks
        },
        tooltip: {
          theme: 'dark',
          x:     { show: true },
          y:     { formatter: val => val.toFixed(1) },
          style: { fontSize: '13px' }
        },
        dataLabels: { enabled: false },
        legend: {
          position:        'bottom',
          horizontalAlign: 'center',
          labels:          { colors: '#d1d1d6' },
          markers:         { width: 10, height: 10, radius: 2 }
        }
      }
    ).render();
  }

  // invoke both
  drawTasksChart();
  drawWellnessChart();
});