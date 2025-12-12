// Global state
let state = {
  city: "Bengaluru",
  pollutant: "AQI",
  range: "live",
  view: "line",
  realtime: true,
  currentPage: "dashboard",
};

// Chart instances
let chart = null;
let forecastChart = null;
let radarChart = null;
let hourlyChart = null;

// Timers & alert history
let realtimeTimer = null;
let alertHistory = [];

// Cached DOM elements
const navTabs = document.querySelectorAll(".nav-tab");
const pageSections = document.querySelectorAll(".page-section");
const citySelect = document.getElementById("citySelect");
const pollutantButtons = document.getElementById("pollutantButtons");
const timeButtons = document.getElementById("timeButtons");
const viewButtons = document.getElementById("viewButtons");
const btnRefreshNow = document.getElementById("btnRefreshNow");
const btnToggleRealtime = document.getElementById("btnToggleRealtime");
const footerStatus = document.getElementById("footerStatus");

// Dashboard elements
const currentAqiEl = document.getElementById("currentAqi");
const pm25ValueEl = document.getElementById("pm25Value");
const pm10ValueEl = document.getElementById("pm10Value");
const lastUpdatedEl = document.getElementById("lastUpdated");
const aqiStatusEl = document.getElementById("aqiStatus");
const healthAdviceEl = document.getElementById("healthAdvice");
const activeCityLabelEl = document.getElementById("activeCityLabel");
const activePollutantLabelEl = document.getElementById("activePollutantLabel");
const chartTitleEl = document.getElementById("chartTitle");
const chartSubtitleEl = document.getElementById("chartSubtitle");
const snapshotListEl = document.getElementById("snapshotList");

// Alerts
const alertBannerEl = document.getElementById("alertBanner");
const alertMessageEl = document.getElementById("alertMessage");
const alertThresholdInput = document.getElementById("alertThreshold");
const alertThreshold2Input = document.getElementById("alertThreshold2");
const pm25ThresholdInput = document.getElementById("pm25Threshold");
const pm10ThresholdInput = document.getElementById("pm10Threshold");
const alertHistoryEl = document.getElementById("alertHistory");

// Forecast
const forecastGridEl = document.getElementById("forecastGrid");

// Analytics
const avgAqiEl = document.getElementById("avgAqi");
const bestDayEl = document.getElementById("bestDay");
const worstDayEl = document.getElementById("worstDay");

// Health
const ageGroupEl = document.getElementById("ageGroup");
const exposureTimeEl = document.getElementById("exposureTime");
const healthConditionEl = document.getElementById("healthCondition");
const calculateRiskBtn = document.getElementById("calculateRisk");
const riskResultEl = document.getElementById("riskResult");
const riskLevelEl = document.getElementById("riskLevel");
const riskAdviceEl = document.getElementById("riskAdvice");
const healthRecommendationsEl = document.getElementById("healthRecommendations");

// ---------------------- INITIALIZATION ---------------------- //

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupButtonGroups();
  setupCitySelect();
  setupAlertInputsSync();
  setupHealthCalculator();
  initMainChart();
  updateAll();
  startRealtime();
});

// ---------------------- SETUP FUNCTIONS ---------------------- //

function setupNavigation() {
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const page = tab.dataset.page;

      // Update active tab
      navTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Show correct page
      pageSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(page + "-page").classList.add("active");

      state.currentPage = page;

      // Lazy init / refresh per page
      if (page === "forecast") initForecast();
      if (page === "analytics") initAnalytics();
      if (page === "health") updateHealthRecommendations();
      if (page === "alerts") updateAlertHistory();
    });
  });
}

function setupButtonGroups() {
  // Pollutant buttons
  pollutantButtons.addEventListener("click", (e) => {
    if (e.target.matches("button")) {
      setActiveButton(pollutantButtons, e.target);
      state.pollutant = e.target.dataset.pollutant;
      activePollutantLabelEl.textContent = state.pollutant;
      updateAll();
    }
  });

  // Time range buttons
  timeButtons.addEventListener("click", (e) => {
    if (e.target.matches("button")) {
      setActiveButton(timeButtons, e.target);
      state.range = e.target.dataset.range;
      updateAll();
    }
  });

  // View buttons (line / bar)
  viewButtons.addEventListener("click", (e) => {
    if (e.target.matches("button")) {
      setActiveButton(viewButtons, e.target);
      state.view = e.target.dataset.view;
      updateChartView();
    }
  });

  // Refresh button
  btnRefreshNow.addEventListener("click", () => {
    updateAll();
  });

  // Toggle realtime
  btnToggleRealtime.addEventListener("click", () => {
    state.realtime = !state.realtime;
    if (state.realtime) {
      btnToggleRealtime.textContent = "⏱ Stop Live";
      footerStatus.textContent = "Realtime: ON";
      startRealtime();
    } else {
      btnToggleRealtime.textContent = "▶ Start Live";
      footerStatus.textContent = "Realtime: OFF";
      stopRealtime();
    }
  });
}

function setupCitySelect() {
  citySelect.addEventListener("change", () => {
    state.city = citySelect.value;
    activeCityLabelEl.textContent = state.city;
    updateAll();
  });
}

function setupAlertInputsSync() {
  // Keep AQI threshold synced between sidebar and Alerts page
  if (alertThresholdInput && alertThreshold2Input) {
    alertThresholdInput.addEventListener("input", () => {
      alertThreshold2Input.value = alertThresholdInput.value;
    });
    alertThreshold2Input.addEventListener("input", () => {
      alertThresholdInput.value = alertThreshold2Input.value;
    });
  }
}

function setupHealthCalculator() {
  calculateRiskBtn.addEventListener("click", () => {
    const currentAqi = parseInt(currentAqiEl.textContent || "0", 10) || 0;
    const ageGroup = ageGroupEl.value;
    const exposure = parseFloat(exposureTimeEl.value) || 0;
    const condition = healthConditionEl.value;

    const { riskScore, level, advice } = computeHealthRisk(
      currentAqi,
      ageGroup,
      exposure,
      condition
    );

    riskLevelEl.textContent = `${level} (Score: ${riskScore.toFixed(1)})`;
    riskAdviceEl.textContent = advice;
    riskResultEl.style.display = "block";
  });
}

// ---------------------- CHART INITIALIZATION ---------------------- //

function initMainChart() {
  const ctx = document.getElementById("aqiChart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: state.view,
    data: {
      labels: [],
      datasets: [
        {
          label: "AQI",
          data: [],
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.3)" },
        },
        y: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.3)" },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb",
          },
        },
      },
    },
  });
}

function initForecast() {
  // 24h forecast cards
  updateForecastCards();

  // Weekly forecast chart
  const ctx = document.getElementById("forecastChart").getContext("2d");
  if (forecastChart) forecastChart.destroy();

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = labels.map(() => randomInt(40, 200));

  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Predicted AQI",
          data,
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.3)" },
        },
        y: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.3)" },
        },
      },
    },
  });
}

function initAnalytics() {
  // Monthly stats
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const values = days.map(() => randomInt(40, 200));

  const avg =
    values.reduce((sum, v) => sum + v, 0) / (values.length || 1);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const bestDay = days[values.indexOf(minVal)];
  const worstDay = days[values.indexOf(maxVal)];

  avgAqiEl.textContent = avg.toFixed(1);
  bestDayEl.textContent = `Day ${bestDay} (${minVal})`;
  worstDayEl.textContent = `Day ${worstDay} (${maxVal})`;

  // Radar chart for pollutants
  const ctxRadar = document.getElementById("radarChart").getContext("2d");
  if (radarChart) radarChart.destroy();

  radarChart = new Chart(ctxRadar, {
    type: "radar",
    data: {
      labels: ["AQI", "PM2.5", "PM10", "NO₂", "O₃"],
      datasets: [
        {
          label: "Current Levels",
          data: [
            parseInt(currentAqiEl.textContent || "0", 10) || 0,
            parseInt(pm25ValueEl.textContent || "0", 10) || 0,
            parseInt(pm10ValueEl.textContent || "0", 10) || 0,
            randomInt(10, 80),
            randomInt(10, 80),
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: { color: "rgba(55,65,81,0.4)" },
          angleLines: { color: "rgba(55,65,81,0.4)" },
          pointLabels: { color: "#e5e7eb" },
        },
      },
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" },
        },
      },
    },
  });

  // Hourly average AQI
  const ctxHourly = document.getElementById("hourlyChart").getContext("2d");
  if (hourlyChart) hourlyChart.destroy();

  const hours = ["0h", "4h", "8h", "12h", "16h", "20h"];
  const hourlyData = hours.map(() => randomInt(40, 180));

  hourlyChart = new Chart(ctxHourly, {
    type: "bar",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Average AQI",
          data: hourlyData,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.3)" },
        },
        y: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(55,65,81,0.3)" },
        },
      },
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" },
        },
      },
    },
  });
}

// ---------------------- REALTIME ---------------------- //

function startRealtime() {
  stopRealtime();
  realtimeTimer = setInterval(() => {
    if (state.realtime) {
      updateAll();
    }
  }, 5000);
}

function stopRealtime() {
  if (realtimeTimer) {
    clearInterval(realtimeTimer);
    realtimeTimer = null;
  }
}

// ---------------------- UPDATE FUNCTIONS ---------------------- //

function updateAll() {
  const metrics = generateCurrentMetrics();
  updateDashboardCards(metrics);
  updateChart(metrics);
  updateSnapshots();
  updateAlertBanner(metrics);
  checkThresholdAlerts(metrics);

  if (state.currentPage === "forecast") {
    updateForecastCards();
  } else if (state.currentPage === "analytics") {
    initAnalytics();
  } else if (state.currentPage === "health") {
    updateHealthRecommendations();
  } else if (state.currentPage === "alerts") {
    updateAlertHistory();
  }
}

function updateDashboardCards(metrics) {
  currentAqiEl.textContent = metrics.aqi;
  pm25ValueEl.textContent = metrics.pm25;
  pm10ValueEl.textContent = metrics.pm10;
  lastUpdatedEl.textContent = metrics.lastUpdated;

  const { label, badgeClass, advice } = classifyAqi(metrics.aqi);
  aqiStatusEl.textContent = label;
  aqiStatusEl.className = `badge ${badgeClass}`;
  healthAdviceEl.textContent = advice;
}

function updateChart(metrics) {
  if (!chart) return;

  const { labels, values } = generateSeriesForRange(
    state.range,
    state.pollutant,
    metrics
  );

  chart.data.labels = labels;
  chart.data.datasets[0].label = `${state.pollutant} (${state.range})`;
  chart.data.datasets[0].data = values;
  chart.update();

  chartTitleEl.textContent =
    state.range === "live"
      ? `Live ${state.pollutant} Trend`
      : `${state.pollutant} Trend - ${state.range}`;
  chartSubtitleEl.innerHTML = `City: <span id="activeCityLabel">${state.city}</span> · Pollutant: <span id="activePollutantLabel">${state.pollutant}</span>`;
}

function updateChartView() {
  if (!chart) return;
  chart.config.type = state.view;
  chart.update();
}

function updateSnapshots() {
  const cities = ["Bengaluru", "Mumbai", "Delhi", "Chennai"];
  snapshotListEl.innerHTML = "";
  cities.forEach((city) => {
    const aqi = randomInt(40, 220);
    const { label } = classifyAqi(aqi);
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${city}</span>
      <span>${aqi} (${label})</span>
    `;
    snapshotListEl.appendChild(li);
  });
}

function updateForecastCards() {
  forecastGridEl.innerHTML = "";
  const now = new Date();
  for (let i = 1; i <= 8; i++) {
    const future = new Date(now.getTime() + i * 3 * 60 * 60 * 1000);
    const hour = future.getHours().toString().padStart(2, "0");
    const timeLabel = `${hour}:00`;
    const aqi = randomInt(40, 200);
    const { label } = classifyAqi(aqi);

    const div = document.createElement("div");
    div.className = "forecast-item";
    div.innerHTML = `
      <div class="forecast-time">${timeLabel}</div>
      <div class="forecast-icon">🌫️</div>
      <div class="forecast-aqi">${aqi}</div>
      <div class="muted">${label}</div>
    `;
    forecastGridEl.appendChild(div);
  }
}

function updateAlertBanner(metrics) {
  const threshold = parseInt(alertThresholdInput.value || "150", 10) || 150;
  if (metrics.aqi >= threshold) {
    alertBannerEl.style.display = "block";
    alertMessageEl.textContent = `AQI ${metrics.aqi} crossed threshold ${threshold} in ${state.city}.`;
  } else {
    alertBannerEl.style.display = "none";
  }
}

function checkThresholdAlerts(metrics) {
  const aqiThreshold = parseInt(alertThresholdInput.value || "150", 10) || 150;
  const pm25Threshold =
    parseInt(pm25ThresholdInput.value || "55", 10) || 55;
  const pm10Threshold =
    parseInt(pm10ThresholdInput.value || "154", 10) || 154;

  const now = new Date().toLocaleString();
  if (metrics.aqi >= aqiThreshold) {
    addAlert(`AQI reached ${metrics.aqi} (Threshold: ${aqiThreshold})`, now);
  }
  if (metrics.pm25 >= pm25Threshold) {
    addAlert(
      `PM2.5 reached ${metrics.pm25} µg/m³ (Threshold: ${pm25Threshold})`,
      now
    );
  }
  if (metrics.pm10 >= pm10Threshold) {
    addAlert(
      `PM10 reached ${metrics.pm10} µg/m³ (Threshold: ${pm10Threshold})`,
      now
    );
  }
}

function addAlert(message, time) {
  alertHistory.unshift({ message, time });
  // Limit history
  if (alertHistory.length > 20) alertHistory.pop();
  if (state.currentPage === "alerts") updateAlertHistory();
}

function updateAlertHistory() {
  alertHistoryEl.innerHTML = "";
  if (!alertHistory.length) {
    alertHistoryEl.innerHTML =
      '<p class="muted">No recent alerts.</p>';
    return;
  }
  alertHistory.forEach((alert) => {
    const div = document.createElement("div");
    div.className = "alert-item";
    div.innerHTML = `
      <div class="alert-item-time">${alert.time}</div>
      <div class="alert-item-message">${alert.message}</div>
    `;
    alertHistoryEl.appendChild(div);
  });
}

function updateHealthRecommendations() {
  const aqi =
    parseInt(currentAqiEl.textContent || "0", 10) || randomInt(50, 180);
  const { label } = classifyAqi(aqi);

  healthRecommendationsEl.innerHTML = "";

  const recs = [];
  if (aqi <= 50) {
    recs.push("Enjoy outdoor activities normally.");
    recs.push("Keep windows open for fresh air.");
  } else if (aqi <= 100) {
    recs.push("Sensitive groups should reduce prolonged outdoor exertion.");
    recs.push("Consider wearing a basic mask in heavy traffic.");
  } else if (aqi <= 150) {
    recs.push("Limit outdoor exercise to early mornings or late evenings.");
    recs.push("Close windows near busy roads.");
  } else if (aqi <= 200) {
    recs.push("Avoid outdoor exercise; move workouts indoors.");
    recs.push("Use an N95 mask if going outside.");
  } else {
    recs.push("Stay indoors with air purifiers if available.");
    recs.push("Avoid all outdoor exertion.");
  }

  recs.forEach((text) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${label}</span><span>${text}</span>`;
    healthRecommendationsEl.appendChild(li);
  });
}

// ---------------------- DATA GENERATION & HELPERS ---------------------- //

function generateCurrentMetrics() {
  // Basic random simulation per city
  const baseByCity = {
    Bengaluru: 90,
    Mumbai: 110,
    Delhi: 160,
    Chennai: 100,
  };
  const base = baseByCity[state.city] || 100;

  const aqi = clampInt(base + randomInt(-30, 40), 20, 300);
  const pm25 = clampInt(aqi * 0.6 + randomInt(-10, 10), 5, 200);
  const pm10 = clampInt(aqi * 0.8 + randomInt(-20, 20), 10, 250);
  const lastUpdated = new Date().toLocaleTimeString();

  return { aqi, pm25, pm10, lastUpdated };
}

function generateSeriesForRange(range, pollutant, metrics) {
  let labels = [];
  let values = [];

  if (range === "live") {
    labels = Array.from({ length: 12 }, (_, i) => `${i * 5}m`);
  } else if (range === "24h") {
    labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  } else if (range === "7d") {
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }

  const currentValue =
    pollutant === "AQI"
      ? metrics.aqi
      : pollutant === "PM2.5"
      ? metrics.pm25
      : pollutant === "PM10"
      ? metrics.pm10
      : randomInt(10, 80);

  const base =
    pollutant === "AQI"
      ? metrics.aqi
      : pollutant === "PM2.5"
      ? metrics.pm25
      : pollutant === "PM10"
      ? metrics.pm10
      : currentValue;

  values = labels.map(() =>
    clampInt(base + randomInt(-25, 25), 10, 300)
  );

  // Ensure last point is close to current
  if (values.length) {
    values[values.length - 1] = currentValue;
  }

  return { labels, values };
}

function classifyAqi(aqi) {
  if (aqi <= 50) {
    return {
      label: "Good",
      badgeClass: "badge-good",
      advice: "Air quality is satisfactory. Enjoy outdoor activities.",
    };
  } else if (aqi <= 100) {
    return {
      label: "Moderate",
      badgeClass: "badge-moderate",
      advice:
        "Acceptable air quality. Sensitive individuals should reduce long outdoor exertion.",
    };
  } else if (aqi <= 150) {
    return {
      label: "Unhealthy for Sensitive Groups",
      badgeClass: "badge-moderate",
      advice:
        "People with respiratory or heart disease, children and older adults should limit outdoor exertion.",
    };
  } else if (aqi <= 200) {
    return {
      label: "Unhealthy",
      badgeClass: "badge-poor",
      advice:
        "Everyone may begin to experience health effects; limit outdoor activities.",
    };
  } else {
    return {
      label: "Very Unhealthy",
      badgeClass: "badge-poor",
      advice:
        "Serious health effects possible. Avoid outdoor activities as much as possible.",
    };
  }
}

function computeHealthRisk(aqi, ageGroup, exposure, condition) {
  // Simple scoring system
  let score = aqi / 50; // base risk from AQI

  if (ageGroup === "child" || ageGroup === "senior") score += 1;
  if (exposure > 2) score += (exposure - 2) * 0.3;

  if (condition === "asthma" || condition === "respiratory") score += 2;
  if (condition === "heart") score += 1.5;

  let level = "Low";
  let advice = "Risk is relatively low. Maintain normal precautions.";

  if (score > 3 && score <= 5) {
    level = "Moderate";
    advice =
      "Consider limiting outdoor exposure and wear a mask in polluted areas.";
  } else if (score > 5 && score <= 7) {
    level = "High";
    advice =
      "Limit outdoor activities and stay indoors when pollution is high.";
  } else if (score > 7) {
    level = "Very High";
    advice =
      "Avoid going outside unless necessary. Use air purifiers and masks.";
  }

  return { riskScore: score, level, advice };
}

// Helpers
function setActiveButton(group, activeBtn) {
  group.querySelectorAll("button").forEach((btn) => {
    btn.classList.remove("active");
  });
  activeBtn.classList.add("active");
}

function randomInt(min, max) {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

