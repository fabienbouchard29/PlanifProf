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
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&past_days=7&forecast_days=7`
    );
    return res.json();
  }

  function iso(d) {
    return d.toISOString().slice(0, 10);
  }

  function render(container, weekStart) {
    const city = getCity();
    container.innerHTML = "";
    const box = document.createElement("div");
    box.className = "weather-box";

    if (!city) {
      box.innerHTML = `
        <span>🌦️ Ajouter une ville pour voir la météo :</span>
        <input type="text" id="weather-city-input" placeholder="Ex. Montréal" />
        <button type="button" class="btn btn-ghost btn-small" id="weather-city-save">Enregistrer</button>
      `;
      container.appendChild(box);
      box.querySelector("#weather-city-save").addEventListener("click", async () => {
        const name = box.querySelector("#weather-city-input").value.trim();
        if (!name) return;
        const results = await geocode(name);
        if (results.length === 0) {
          alert("Ville introuvable.");
          return;
        }
        const r = results[0];
        saveCity({ name: r.name, lat: r.latitude, lon: r.longitude });
        render(container, weekStart);
      });
      return;
    }

    box.classList.add("weather-week");
    box.innerHTML = `<div class="weather-top-row"><span class="weather-city-label">📍 ${city.name}</span><button type="button" class="btn btn-ghost btn-small" id="weather-change">Changer</button></div>`;
    const strip = document.createElement("div");
    strip.className = "weather-strip";
    strip.innerHTML = '<span class="muted">Chargement de la météo…</span>';
    box.appendChild(strip);
    container.appendChild(box);

    box.querySelector("#weather-change").addEventListener("click", () => {
      saveCity(null);
      render(container, weekStart);
    });

    const start = weekStart || new Date();

    fetchDailyForecast(city.lat, city.lon)
      .then((data) => {
        strip.innerHTML = "";
        const days = (data.daily && data.daily.time) || [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const dIso = iso(d);
          const idx = days.indexOf(dIso);
          const chip = document.createElement("div");
          chip.className = "weather-day-chip";
          if (idx === -1) {
            chip.innerHTML = `<span class="wd-na">—</span>`;
            chip.title = d.toLocaleDateString("fr-CA", { weekday: "long" });
          } else {
            const code = data.daily.weather_code[idx];
            const max = Math.round(data.daily.temperature_2m_max[idx]);
            const min = Math.round(data.daily.temperature_2m_min[idx]);
            const desc = WEATHER_CODES[code] || "🌡️ —";
            const icon = desc.split(" ")[0];
            chip.title = `${d.toLocaleDateString("fr-CA", { weekday: "long" })} — ${desc.replace(/^\S+\s*/, "")}`;
            chip.innerHTML = `<span class="wd-icon">${icon}</span><span class="wd-temp">${max}°/${min}°</span>`;
          }
          strip.appendChild(chip);
        }
      })
      .catch(() => {
        strip.innerHTML = '<span class="muted">Météo indisponible pour le moment.</span>';
      });
  }

  window.Weather = { render, getCity, saveCity, geocode };
})();
