// State
const state = {
  city: {
    name: 'New York',
    lat: 40.7143,
    lon: -74.006
  },
  units: {
    temp: 'celsius', // celsius | fahrenheit
    wind: 'kmh',     // kmh | mph
    precip: 'mm'     // mm | inch
  },
  hourlyOffset: 0,
  weatherData: null
};

// Map Weather Codes to Icons
const getWeatherIcon = (code) => {
  if ([0].includes(code)) return 'icon-sunny.webp';
  if ([1, 2].includes(code)) return 'icon-partly-cloudy.webp';
  if ([3].includes(code)) return 'icon-overcast.webp';
  if ([45, 48].includes(code)) return 'icon-fog.webp';
  if ([51, 53, 55, 56, 57].includes(code)) return 'icon-drizzle.webp';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'icon-rain.webp';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'icon-snow.webp';
  if ([95, 96, 99].includes(code)) return 'icon-storm.webp';
  return 'icon-sunny.webp'; // fallback
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadPreferences();
  setupEventListeners();
  fetchWeather();
});

function loadPreferences() {
  const savedUnits = localStorage.getItem('weather-units');
  if (savedUnits) {
    state.units = JSON.parse(savedUnits);
  }
  const savedCity = localStorage.getItem('weather-city');
  if (savedCity) {
    state.city = JSON.parse(savedCity);
  }
  
  // Sync UI with state
  const tempRadio = document.querySelector(`input[name="temp-unit"][value="${state.units.temp}"]`);
  if (tempRadio) tempRadio.checked = true;
  
  const windRadio = document.querySelector(`input[name="wind-unit"][value="${state.units.wind}"]`);
  if (windRadio) windRadio.checked = true;
  
  const precipRadio = document.querySelector(`input[name="precip-unit"][value="${state.units.precip}"]`);
  if (precipRadio) precipRadio.checked = true;
}

function savePreferences() {
  localStorage.setItem('weather-units', JSON.stringify(state.units));
  localStorage.setItem('weather-city', JSON.stringify(state.city));
}

// UI Elements
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const unitsBtn = document.getElementById('units-toggle-btn');
const unitsDropdown = document.getElementById('units-dropdown');
const searchBtn = document.getElementById('search-btn');

const hourlyDropdownBtn = document.getElementById('hourly-dropdown-btn');
const hourlyDropdownList = document.getElementById('hourly-dropdown-list');

const mainContent = document.querySelector('.main-content');
const searchMessage = document.getElementById('search-message');
const searchSection = document.querySelector('.search-section');
const retryBtn = document.getElementById('retry-btn');
const errorContainer = document.getElementById('api-error');

function setupEventListeners() {
  // Search
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length < 2) {
      searchResults.classList.add('hidden');

      searchMessage.classList.add('hidden');
      mainContent.classList.remove('hidden');
      return;
    }
    searchTimeout = setTimeout(() => {
      fetchCities(query);
    }, 500);
  });

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
      fetchCities(query);
    }
  });

  retryBtn.addEventListener('click', () => {
    errorContainer.classList.add('hidden');
    fetchWeather();
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target) && !searchBtn.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
    if (!unitsBtn.contains(e.target) && !unitsDropdown.contains(e.target)) {
      unitsDropdown.classList.add('hidden');
      unitsBtn.setAttribute('aria-expanded', 'false');
    }
    if (hourlyDropdownBtn && hourlyDropdownList) {
      if (!hourlyDropdownBtn.contains(e.target) && !hourlyDropdownList.contains(e.target)) {
        hourlyDropdownList.classList.add('hidden');
      }
    }
  });

  // Units Dropdown Toggle
  unitsBtn.addEventListener('click', () => {
    const isHidden = unitsDropdown.classList.contains('hidden');
    unitsDropdown.classList.toggle('hidden');
    unitsBtn.setAttribute('aria-expanded', !isHidden);
  });

  // Hourly Dropdown Toggle
  if (hourlyDropdownBtn && hourlyDropdownList) {
    hourlyDropdownBtn.addEventListener('click', () => {
      hourlyDropdownList.classList.toggle('hidden');
    });
  }

  const unitInputs = document.querySelectorAll('#units-dropdown input[type="radio"]');
  unitInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const name = e.target.name;
      const val = e.target.value;
      if (name === 'temp-unit') state.units.temp = val;
      if (name === 'wind-unit') state.units.wind = val;
      if (name === 'precip-unit') state.units.precip = val;
      savePreferences();
      fetchWeather(); // Refetch Data with new units
    });
  });
}

function showErrorState(show) {
  if (show) {
    errorContainer.classList.remove('hidden');
    mainContent.classList.add('hidden');
    searchMessage.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchSection.classList.add('hidden');
  } else {
    errorContainer.classList.add('hidden');
    searchSection.classList.remove('hidden');
    mainContent.classList.remove('hidden');
    searchResults.classList.remove('hidden');
  }
}

async function fetchCities(query) {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
    const data = await res.json();

    searchResults.innerHTML = '';
    if (data.results && data.results.length > 0) {
      searchMessage.classList.add('hidden');
      mainContent.classList.remove('hidden');
      
      data.results.forEach(city => {
        const li = document.createElement('li');
        li.textContent = `${city.name}, ${city.admin1 ? city.admin1 + ', ' : ''}${city.country}`;
        li.addEventListener('click', () => {
          state.city = { name: city.name, lat: city.latitude, lon: city.longitude };
          savePreferences();
          searchInput.value = '';
          searchResults.classList.add('hidden');
          fetchWeather();
        });
        searchResults.appendChild(li);
      });
      searchResults.classList.remove('hidden');
    } else {
      if (data.results === undefined || data.results?.length === 0) {
        searchMessage.classList.remove('hidden');
        mainContent.classList.add('hidden');
      }

      // const li = document.createElement('li');
      // li.textContent = "No results found";
      // li.style.color = "#aaa";
      // li.style.cursor = "default";
      // searchResults.appendChild(li);
      // searchResults.classList.remove('hidden');
    }
  } catch (err) {
    showErrorState(true);
    console.error("Error fetching cities", err);
  }
}

async function fetchWeather() {
  try {
    const { lat, lon } = state.city;
    const { temp, wind, precip } = state.units;
    
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
      hourly: 'temperature_2m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
      temperature_unit: temp,
      wind_speed_unit: wind,
      precipitation_unit: precip
    });

    // Loading State
    const currentIcon = document.getElementById('current-icon');
    if (currentIcon) {
      currentIcon.src = './assets/images/icon-loading.svg';
      currentIcon.classList.add('spin');
    }
    
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    const data = await res.json();
    
    state.weatherData = data;
    renderAll();
    showErrorState(false);
  } catch (err) {
    showErrorState(true);
    console.error("Failed to fetch weather", err);
  }
}

function renderAll() {
  renderCurrent();
  renderHourly();
  renderDaily();
}

function renderCurrent() {
  if (!state.weatherData) return;
  const { current, current_units } = state.weatherData;
  
  const spinner = document.getElementById('spinner');
  const currentCardContent = document.getElementsByClassName('current-item-content');
  spinner.classList.add('hidden');
  for (let i = 0; i < currentCardContent.length; i++) {
    currentCardContent[i].classList.remove('hidden');
  }

  const iconEl = document.getElementById('current-icon');
  iconEl.src = `./assets/images/${getWeatherIcon(current.weather_code)}`;
  iconEl.classList.remove('spin');
  
  document.getElementById('current-temp').textContent = `${Math.round(current.temperature_2m)}°`;
  document.getElementById('current-city').textContent = state.city.name;
  
  // Format Date for Desktop
  const dateObj = new Date(current.time || new Date());
  document.getElementById('current-date').textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  
  document.getElementById('current-feels-like').textContent = `${Math.round(current.apparent_temperature)}°`;
  document.getElementById('current-humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('current-wind').textContent = `${current.wind_speed_10m} ${current_units.wind_speed_10m}`;
  document.getElementById('current-precip').textContent = `${current.precipitation} ${current_units.precipitation}`;
}

function renderHourly() {
  if (!state.weatherData) return;
  
  const { hourly } = state.weatherData;
  const list = document.getElementById('hourly-list');
  const label = document.getElementById('selected-day-label');
  const dropdownList = document.getElementById('hourly-dropdown-list');
  
  list.innerHTML = '';
  if(dropdownList) dropdownList.innerHTML = '';
  
  // Update dropdown list
  const daily = state.weatherData.daily;
  if(dropdownList && daily && daily.time) {
    daily.time.forEach((dateStr, idx) => {
      const d = new Date(dateStr);
      let dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      if (idx === 0) dayName = 'Today';
      else if (idx === 1) dayName = 'Tomorrow';

      const li = document.createElement('li');
      li.textContent = dayName;
      li.addEventListener('click', () => {
        state.hourlyOffset = idx;
        renderHourly();
        dropdownList.classList.add('hidden');
      });
      dropdownList.appendChild(li);

      if (state.hourlyOffset === idx) {
        label.textContent = dayName;
      }
    });
  }

  // Extract the 24 hours for the selected day offset
  const startIndex = state.hourlyOffset * 24;
  const endIndex = startIndex + 24;

  for (let i = startIndex; i < endIndex; i++) {
    const timeStr = hourly.time[i];
    const dateObj = new Date(timeStr);
    
    // Format AM/PM
    let displayTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(':00', '');
    
    const temp = Math.round(hourly.temperature_2m[i]);
    const code = hourly.weather_code[i];

    const card = document.createElement('div');
    card.className = 'hourly-card';
    card.innerHTML = `
      <div class="hourly-info">
        <img src="./assets/images/${getWeatherIcon(code)}" alt="" class="hourly-icon" />
        <span class="hourly-time">${displayTime}</span>
      </div>
      <span class="hourly-temp">${temp}&deg;</span>
    `;
    list.appendChild(card);
  }
}

function renderDaily() {
  if (!state.weatherData) return;
  
  const { daily } = state.weatherData;
  const grid = document.getElementById('daily-grid');
  grid.innerHTML = '';

  // We have 7 days
  for (let i = 0; i < daily.time.length; i++) {
    const dateStr = daily.time[i];
    const dateObj = new Date(dateStr);
    
    // Increment the date object by adding timezone offset to ensure correct weekday 
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    
    const maxT = Math.round(daily.temperature_2m_max[i]);
    const minT = Math.round(daily.temperature_2m_min[i]);
    const code = daily.weather_code[i];

    const card = document.createElement('div');
    card.className = 'daily-card';
    card.innerHTML = `
      <span class="daily-day">${dayName}</span>
      <img src="./assets/images/${getWeatherIcon(code)}" alt="" class="daily-icon" />
      <div class="daily-temps">
        <span class="daily-high">${maxT}&deg;</span>
        <span class="daily-low">${minT}&deg;</span>
      </div>
    `;
    grid.appendChild(card);
  }
}
