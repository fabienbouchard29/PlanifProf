(function () {
  function getEvents() {
    return Store.get("events", {});
  }
  function saveEvents(e) {
    Store.set("events", e);
  }
  function keyFor(iso, periodId) {
    return iso + "::" + periodId;
  }

  let weekStart = startOfWeek(new Date());

  function startOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
  function iso(d) {
    return d.toISOString().slice(0, 10);
  }
  function formatDayHeader(d) {
    return d.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "short" });
  }

  function openEventModal(dateIso, period) {
    const events = getEvents();
    const existing = events[keyFor(dateIso, period.id)];
    const subjects = Subjects.getSubjects();
    const modal = document.getElementById("event-modal");
    modal.querySelector(".modal-title").textContent = `${period.label} — ${dateIso}`;
    const form = modal.querySelector("#event-form");
    form.title.value = existing ? existing.title : "";
    form.notes.value = existing ? existing.notes : "";
    form.taught.checked = !!(existing && existing.taught);
    const select = form.subjectId;
    select.innerHTML =
      '<option value="">— Aucune —</option>' +
      subjects.map((s) => `<option value="${s.id}" ${existing && existing.subjectId === s.id ? "selected" : ""}>${s.name}</option>`).join("");

    let selectedHighlight = (existing && existing.highlight) || "";
    const picker = modal.querySelector("#highlight-picker");
    picker.querySelectorAll(".highlight-swatch").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.highlight === selectedHighlight);
      btn.onclick = () => {
        selectedHighlight = btn.dataset.highlight;
        picker.querySelectorAll(".highlight-swatch").forEach((b) => b.classList.toggle("selected", b === btn));
      };
    });

    modal.querySelector("#event-delete").style.display = existing ? "inline-block" : "none";
    modal.classList.add("open");

    form.onsubmit = (e) => {
      e.preventDefault();
      const evs = getEvents();
      const entry = {
        title: form.title.value.trim(),
        subjectId: select.value || null,
        notes: form.notes.value.trim(),
        highlight: selectedHighlight || null,
        taught: form.taught.checked,
      };
      if (!entry.title && !entry.notes && !entry.subjectId && !entry.highlight && !entry.taught) {
        delete evs[keyFor(dateIso, period.id)];
      } else {
        evs[keyFor(dateIso, period.id)] = entry;
      }
      saveEvents(evs);
      modal.classList.remove("open");
      render(document.getElementById("view-calendrier"));
    };
    modal.querySelector("#event-delete").onclick = () => {
      const evs = getEvents();
      delete evs[keyFor(dateIso, period.id)];
      saveEvents(evs);
      modal.classList.remove("open");
      render(document.getElementById("view-calendrier"));
    };
    modal.querySelector(".modal-close").onclick = () => modal.classList.remove("open");
  }

  function toggleTaught(dateIso, period) {
    const evs = getEvents();
    const key = keyFor(dateIso, period.id);
    const existing = evs[key] || { title: "", subjectId: null, notes: "", highlight: null, taught: false };
    existing.taught = !existing.taught;
    evs[key] = existing;
    saveEvents(evs);
    render(document.getElementById("view-calendrier"));
  }

  function formatRangeLabel(start, end) {
    const sameYear = start.getFullYear() === end.getFullYear();
    const startStr = start.toLocaleDateString("fr-CA", sameYear ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
    const endStr = end.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
    return `${startStr} – ${endStr}`;
  }

  function render(container) {
    container.innerHTML = "";

    const showWeekends = Store.get("showWeekends", true);
    const dayCount = showWeekends ? 7 : 5;

    const nav = document.createElement("div");
    nav.className = "calendar-nav";
    nav.innerHTML = `
      <button type="button" class="cal-nav-icon" id="cal-prev" title="Semaine précédente">◀</button>
      <h3 class="calendar-range-label">${formatRangeLabel(weekStart, addDays(weekStart, dayCount - 1))}</h3>
      <button type="button" class="cal-nav-icon" id="cal-next" title="Semaine suivante">▶</button>
      <button type="button" class="btn btn-ghost btn-small" id="cal-today">Aujourd'hui</button>
      <span id="weather-widget"></span>
      <label class="weekend-toggle"><input type="checkbox" id="cal-show-weekends" ${showWeekends ? "checked" : ""} /> Fins de semaine</label>
    `;
    container.appendChild(nav);
    nav.querySelector("#cal-prev").addEventListener("click", () => {
      weekStart = addDays(weekStart, -7);
      render(container);
    });
    nav.querySelector("#cal-next").addEventListener("click", () => {
      weekStart = addDays(weekStart, 7);
      render(container);
    });
    nav.querySelector("#cal-today").addEventListener("click", () => {
      weekStart = startOfWeek(new Date());
      render(container);
    });
    nav.querySelector("#cal-show-weekends").addEventListener("change", (e) => {
      Store.set("showWeekends", e.target.checked);
      render(container);
    });
    const weatherEnabled = Modules.isEnabled("meteo");
    if (weatherEnabled) {
      Weather.renderCityControl(nav.querySelector("#weather-widget"), () => render(container));
    }

    Reminders.renderUpcomingWidget(container);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    grid.style.gridTemplateColumns = `repeat(${dayCount}, 1fr)`;
    const events = getEvents();
    const assignments = TemplateView.getAssignments();

    function renderPeriod(col, dIso, period, templateDay) {
      if (period.type === "break") {
        const breakEl = document.createElement("div");
        breakEl.className = "calendar-break";
        breakEl.textContent = `${period.label}${period.start ? " · " + period.start : ""}${period.end ? "–" + period.end : ""}`;
        col.appendChild(breakEl);
        return;
      }
      const ev = events[keyFor(dIso, period.id)];
      const templateSubjId = templateDay ? assignments[TemplateView.keyFor(templateDay.id, period.id)] : null;
      const subjId = (ev && ev.subjectId) || templateSubjId;
      const subj = subjId ? Subjects.getSubject(subjId) : null;
      const cell = document.createElement("div");
      cell.className = "calendar-cell" + (ev && ev.taught ? " taught" : "");
      if (subj) {
        cell.style.borderLeftColor = subj.color;
        cell.style.background = subj.color + "15";
      }
      if (ev && ev.highlight) {
        cell.classList.add("highlight-" + ev.highlight);
      }
      cell.innerHTML = `
        <div class="calendar-cell-period">${period.label}${period.start ? " · " + period.start : ""}</div>
        ${subj ? `<div class="calendar-cell-subject" style="color:${subj.color}">${subj.name}</div>` : ""}
        <textarea class="calendar-cell-note" rows="2" placeholder="Écrire une note…"></textarea>
        <button type="button" class="calendar-cell-more" title="Options (matière, surlignage, détails)">⋯</button>
        <button type="button" class="calendar-cell-taught" title="Marquer comme enseignée">${ev && ev.taught ? "✓" : ""}</button>
      `;
      const noteArea = cell.querySelector(".calendar-cell-note");
      noteArea.value = (ev && ev.title) || "";
      noteArea.title = noteArea.value;
      noteArea.addEventListener("click", (e) => e.stopPropagation());
      noteArea.addEventListener("input", () => {
        noteArea.title = noteArea.value;
        const evs = getEvents();
        const key = keyFor(dIso, period.id);
        const existing = evs[key] || { title: "", subjectId: null, notes: "", highlight: null, taught: false };
        existing.title = noteArea.value;
        if (!existing.title.trim() && !existing.notes && !existing.highlight && !existing.taught && !existing.subjectId) {
          delete evs[key];
        } else {
          evs[key] = existing;
        }
        saveEvents(evs);
      });
      cell.querySelector(".calendar-cell-more").addEventListener("click", (e) => {
        e.stopPropagation();
        openEventModal(dIso, period);
      });
      cell.querySelector(".calendar-cell-taught").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTaught(dIso, period);
      });
      col.appendChild(cell);
    }

    const weatherBadges = {};

    for (let i = 0; i < dayCount; i++) {
      const date = addDays(weekStart, i);
      const dIso = iso(date);
      const templateDay = Config.getTemplateDayForDate(date);
      const col = document.createElement("div");
      col.className = "calendar-day";
      const isToday = iso(new Date()) === dIso;
      col.innerHTML = `<div class="calendar-day-header ${isToday ? "today" : ""}">${formatDayHeader(date)}${
        templateDay ? `<span class="cycle-badge">${templateDay.label}</span>` : ""
      }${weatherEnabled ? `<span class="calendar-day-weather" id="wd-${dIso}"></span>` : ""}</div>`;
      if (weatherEnabled) weatherBadges[dIso] = col.querySelector(`#wd-${dIso}`);
      Reminders.renderDayReminders(col, dIso);
      OutlookSync.forDate(dIso).forEach((ev) => {
        const chip = document.createElement("div");
        chip.className = "reminder-chip outlook-chip";
        chip.title = ev.location || "";
        chip.textContent = `👥 ${ev.time ? ev.time + " " : ""}${ev.title}`;
        col.appendChild(chip);
      });
      TeamsSync.forDate(dIso).forEach((ev) => {
        const chip = document.createElement("div");
        chip.className = "reminder-chip outlook-chip";
        chip.title = ev.location || "";
        chip.textContent = `👥 ${ev.time ? ev.time + " " : ""}${ev.title}`;
        col.appendChild(chip);
      });
      const exceptionType = Config.getExceptionType(dIso);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      if (exceptionType) {
        const banner = document.createElement("div");
        banner.className = "calendar-exception-banner";
        banner.textContent = exceptionType.label;
        banner.style.color = exceptionType.color;
        col.style.background = exceptionType.color + "15";
        col.style.borderColor = exceptionType.color;
        col.appendChild(banner);

        const underlying = Config.getUnderlyingTemplateDay(date);
        if (underlying && underlying.periods.length) {
          underlying.periods.forEach((period) => renderPeriod(col, dIso, period, null));
        }
      } else if (!templateDay || !templateDay.periods.length) {
        const empty = document.createElement("div");
        empty.className = "calendar-empty";
        empty.textContent = isWeekend ? "Fin de semaine" : "Aucun cours";
        col.appendChild(empty);
      } else {
        templateDay.periods.forEach((period) => renderPeriod(col, dIso, period, templateDay));
      }
      grid.appendChild(col);
    }
    container.appendChild(grid);

    if (weatherEnabled && Weather.getCity()) {
      Weather.fetchForecastMap()
        .then((map) => {
          if (!map) return;
          Object.entries(weatherBadges).forEach(([dIso, el]) => {
            if (!el) return;
            const f = map[dIso];
            if (f) {
              el.textContent = `${f.icon} ${f.max}°/${f.min}°`;
              el.title = f.desc;
            }
          });
        })
        .catch(() => {});
    }
  }

  window.CalendarView = { render, getEvents };
})();
