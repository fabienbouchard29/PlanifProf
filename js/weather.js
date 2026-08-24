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

  let openPopover = null;
  function closePopover() {
    if (openPopover) {
      openPopover.remove();
      openPopover = null;
    }
  }

  function render(container, weekStart, dayCount) {
    dayCount = dayCount || 7;
    const city = getCity();
    container.innerHTML = "";

    if (!city) {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "weather-compact-add";
      link.textContent = "🌦️ Ajouter météo";
      link.addEventListener("click", () => {
        const name = prompt("Nom de votre ville :");
        if (!name) return;
        geocode(name.trim()).then((results) => {
          if (!results.length) {
            alert("Ville introuvable.");
            return;
          }
          const r = results[0];
          saveCity({ name: r.name, lat: r.latitude, lon: r.longitude });
          render(container, weekStart, dayCount);
        });
      });
      container.appendChild(link);
      return;
    }

    const compact = document.createElement("button");
    compact.type = "button";
    compact.className = "weather-compact";
    compact.textContent = "…";
    container.appendChild(compact);

    const todayIso = iso(new Date());
    const start = weekStart || new Date();

    fetchDailyForecast(city.lat, city.lon)
      .then((data) => {
        const days = (data.daily && data.daily.time) || [];
        const idx = days.indexOf(todayIso);
        if (idx === -1) {
          compact.textContent = `📍 ${city.name}`;
        } else {
          const code = data.daily.weather_code[idx];
          const max = Math.round(data.daily.temperature_2m_max[idx]);
          const min = Math.round(data.daily.temperature_2m_min[idx]);
          const desc = WEATHER_CODES[code] || "🌡️ —";
          const icon = desc.split(" ")[0];
          compact.textContent = `${icon} ${max}°/${min}°`;
        }

        compact.addEventListener("click", (e) => {
          e.stopPropagation();
          if (openPopover) {
            closePopover();
            return;
          }
          openWeekPopover(compact, city, data, start, dayCount, container, weekStart, dayCount);
        });
      })
      .catch(() => {
        compact.textContent = "🌦️ —";
      });
  }

  function openWeekPopover(anchorEl, city, data, start, dayCount, container, weekStart, dayCountForRerender) {
    closePopover();
    const pop = document.createElement("div");
    pop.className = "popover weather-popover";
    pop.innerHTML = `<div class="popover-title">📍 ${city.name} <button type="button" class="btn btn-ghost btn-small" id="weather-change">Changer</button></div>`;

    const strip = document.createElement("div");
    strip.className = "weather-strip";
    strip.style.gridTemplateColumns = `repeat(${dayCount}, 1fr)`;
    const days = (data.daily && data.daily.time) || [];
    for (let i = 0; i < dayCount; i++) {
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
    pop.appendChild(strip);

    document.body.appendChild(pop);
    const rect = anchorEl.getBoundingClientRect();
    pop.style.top = window.scrollY + rect.bottom + 4 + "px";
    pop.style.left = window.scrollX + rect.left + "px";
    openPopover = pop;

    pop.querySelector("#weather-change").addEventListener("click", () => {
      saveCity(null);
      closePopover();
      render(container, weekStart, dayCountForRerender);
    });

    setTimeout(() => {
      document.addEventListener("click", function handler(e) {
        if (!pop.contains(e.target) && e.target !== anchorEl) {
          closePopover();
          document.removeEventListener("click", handler);
        }
      });
    }, 0);
  }

  window.Weather = { render, getCity, saveCity, geocode };
})();
