(function () {
  const WEATHER_CODES = {
    0: "☀️ Ciel dégagé",
    1: "🌤️ Plutôt dégagé",
    2: "⛅ Partiellement nuageux",
    3: "☁️ Nuageux",
    45: "🌫️ Brouillard",
    48: "🌫️ Brouillard givrant",
    51: "🌦️ Bruine légère",
    53: "🌦️ Bruine",
    55: "🌧️ Bruine forte",
    61: "🌧️ Pluie légère",
    63: "🌧️ Pluie",
    65: "🌧️ Pluie forte",
    71: "🌨️ Neige légère",
    73: "🌨️ Neige",
    75: "❄️ Neige forte",
    80: "🌦️ Averses",
    81: "🌧️ Averses fortes",
    82: "⛈️ Averses violentes",
    95: "⛈️ Orage",
    96: "⛈️ Orage avec grêle",
    99: "⛈️ Orage violent",
  };

  function getCity() {
    return Store.get("weatherCity", null);
  }
  function saveCity(c) {
    Store.set("weatherCity", c);
  }

  async function geocode(name) {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=fr&format=json`);
    const data = await res.json();
    return data.results || [];
  }

  async function fetchDailyForecast(lat, lon) {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&past_days=7&forecast_days=7`
    );
    return res.json();
  }

  // Returns a map of { "YYYY-MM-DD": { icon, max, min, desc, precip, wind } } for a city, or null if no city set.
  async function fetchForecastMap() {
    const city = getCity();
    if (!city) return null;
    const data = await fetchDailyForecast(city.lat, city.lon);
    const days = (data.daily && data.daily.time) || [];
    const map = {};
    days.forEach((dIso, idx) => {
      const code = data.daily.weather_code[idx];
      const desc = WEATHER_CODES[code] || "🌡️ —";
      map[dIso] = {
        icon: desc.split(" ")[0],
        max: Math.round(data.daily.temperature_2m_max[idx]),
        min: Math.round(data.daily.temperature_2m_min[idx]),
        desc: desc.replace(/^\S+\s*/, ""),
        precip: data.daily.precipitation_probability_max ? Math.round(data.daily.precipitation_probability_max[idx]) : null,
        wind: data.daily.wind_speed_10m_max ? Math.round(data.daily.wind_speed_10m_max[idx]) : null,
      };
    });
    return map;
  }

  function renderCityControl(container, onChange) {
    const city = getCity();
    container.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "weather-city-btn";
    if (city) {
      btn.textContent = "📍 " + city.name;
      btn.title = "Changer de ville";
      btn.addEventListener("click", () => {
        if (confirm(`Retirer ${city.name} et changer de ville météo ?`)) {
          saveCity(null);
          if (onChange) onChange();
        }
      });
    } else {
      btn.textContent = "🌦️ + Météo";
      btn.title = "Ajouter une ville pour voir la météo";
      btn.addEventListener("click", () => {
        const name = prompt("Nom de votre ville :");
        if (!name) return;
        geocode(name.trim()).then((results) => {
          if (!results.length) {
            alert("Ville introuvable.");
            return;
          }
          const r = results[0];
          saveCity({ name: r.name, lat: r.latitude, lon: r.longitude });
          if (onChange) onChange();
        });
      });
    }
    container.appendChild(btn);
  }

  window.Weather = { getCity, saveCity, geocode, fetchForecastMap, renderCityControl };
})();
