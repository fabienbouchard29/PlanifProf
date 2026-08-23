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

  async function fetchWeather(lat, lon) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
    return res.json();
  }

  function render(container) {
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
        render(container);
      });
      return;
    }

    box.innerHTML = `<span>Chargement de la météo pour ${city.name}…</span>`;
    container.appendChild(box);
    fetchWeather(city.lat, city.lon)
      .then((data) => {
        const cur = data.current;
        const desc = WEATHER_CODES[cur.weather_code] || "—";
        box.innerHTML = `
          <span class="weather-desc">${desc}</span>
          <span class="weather-temp">${Math.round(cur.temperature_2m)}°C</span>
          <span class="weather-city">${city.name}</span>
          <button type="button" class="btn btn-ghost btn-small" id="weather-change">Changer</button>
        `;
        box.querySelector("#weather-change").addEventListener("click", () => {
          saveCity(null);
          render(container);
        });
      })
      .catch(() => {
        box.innerHTML = `<span>Météo indisponible pour le moment.</span> <button type="button" class="btn btn-ghost btn-small" id="weather-change">Changer de ville</button>`;
        box.querySelector("#weather-change").addEventListener("click", () => {
          saveCity(null);
          render(container);
        });
      });
  }

  window.Weather = { render, getCity, saveCity, geocode };
})();
