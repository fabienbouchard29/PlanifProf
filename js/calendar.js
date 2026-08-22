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
    const select = form.subjectId;
    select.innerHTML =
      '<option value="">— Aucune —</option>' +
      subjects.map((s) => `<option value="${s.id}" ${existing && existing.subjectId === s.id ? "selected" : ""}>${s.name}</option>`).join("");
    modal.querySelector("#event-delete").style.display = existing ? "inline-block" : "none";
    modal.classList.add("open");

    form.onsubmit = (e) => {
      e.preventDefault();
      const evs = getEvents();
      const entry = {
        title: form.title.value.trim(),
        subjectId: select.value || null,
        notes: form.notes.value.trim(),
      };
      if (!entry.title && !entry.notes && !entry.subjectId) {
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

  function render(container) {
    container.innerHTML = "";

    const nav = document.createElement("div");
    nav.className = "calendar-nav";
    nav.innerHTML = `
      <button type="button" class="btn btn-ghost" id="cal-prev">◀ Semaine précédente</button>
      <button type="button" class="btn btn-ghost" id="cal-today">Aujourd'hui</button>
      <button type="button" class="btn btn-ghost" id="cal-next">Semaine suivante ▶</button>
      <button type="button" class="btn btn-primary" id="cal-import-photo">📷 Importer une photo</button>
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
    nav.querySelector("#cal-import-photo").addEventListener("click", () => Ocr.openImportModal());

    const weatherEl = document.createElement("div");
    weatherEl.id = "weather-widget";
    container.appendChild(weatherEl);
    Weather.render(weatherEl);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    const events = getEvents();
    const assignments = TemplateView.getAssignments();

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dIso = iso(date);
      const templateDay = Config.getTemplateDayForDate(date);
      const col = document.createElement("div");
      col.className = "calendar-day";
      const isToday = iso(new Date()) === dIso;
      col.innerHTML = `<div class="calendar-day-header ${isToday ? "today" : ""}">${formatDayHeader(date)}${
        templateDay ? `<span class="cycle-badge">${templateDay.label}</span>` : ""
      }</div>`;
      if (!templateDay || !templateDay.periods.length) {
        const empty = document.createElement("div");
        empty.className = "calendar-empty";
        empty.textContent = "Aucun cours";
        col.appendChild(empty);
      } else {
        templateDay.periods.forEach((period) => {
          const ev = events[keyFor(dIso, period.id)];
          const templateSubjId = assignments[TemplateView.keyFor(templateDay.id, period.id)];
          const subjId = (ev && ev.subjectId) || templateSubjId;
          const subj = subjId ? Subjects.getSubject(subjId) : null;
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "calendar-cell";
          if (subj) {
            cell.style.borderLeftColor = subj.color;
            cell.style.background = subj.color + "15";
          }
          cell.innerHTML = `
            <div class="calendar-cell-period">${period.label}${period.start ? " · " + period.start : ""}</div>
            <div class="calendar-cell-title">${ev && ev.title ? ev.title : subj ? subj.name : ""}</div>
          `;
          cell.addEventListener("click", () => openEventModal(dIso, period));
          col.appendChild(cell);
        });
      }
      grid.appendChild(col);
    }
    container.appendChild(grid);
  }

  window.CalendarView = { render, getEvents };
})();
