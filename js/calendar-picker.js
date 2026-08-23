(function () {
  const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

  let state = null;

  function toISO(d) {
    return d.toISOString().slice(0, 10);
  }

  function ensureState() {
    if (state) return state;
    const now = new Date();
    state = { startYear: now.getFullYear(), startMonth: now.getMonth() };
    return state;
  }

  function monthsFrom(startYear, startMonth, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const y = startYear + Math.floor((startMonth + i) / 12);
      const m = ((startMonth + i) % 12 + 12) % 12;
      list.push({ year: y, month: m });
    }
    return list;
  }

  function buildMonthCells(year, month) {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function renderMonth(cfg, year, month, rootContainer) {
    const box = document.createElement("div");
    box.className = "mini-month";
    box.innerHTML = `<div class="mini-month-title">${MONTH_NAMES[month]} ${year}</div>`;

    const table = document.createElement("table");
    table.className = "mini-month-table";
    table.innerHTML = "<thead><tr>" + DOW_LABELS.map((d) => `<th>${d}</th>`).join("") + "</tr></thead>";

    const tbody = document.createElement("tbody");
    const cells = buildMonthCells(year, month);
    for (let i = 0; i < cells.length; i += 7) {
      const tr = document.createElement("tr");
      cells.slice(i, i + 7).forEach((date) => {
        const td = document.createElement("td");
        if (date) {
          const iso = toISO(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isMarked = cfg.exceptions.includes(iso);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "mini-day" + (isWeekend ? " weekend" : "") + (isMarked ? " marked" : "");
          btn.textContent = String(date.getDate());
          btn.disabled = isWeekend;
          btn.title = isWeekend ? "Fin de semaine (déjà sans école)" : isMarked ? "Cliquer pour retirer" : "Cliquer pour marquer sans école";
          if (!isWeekend) {
            btn.addEventListener("click", () => {
              const idx = cfg.exceptions.indexOf(iso);
              if (idx === -1) cfg.exceptions.push(iso);
              else cfg.exceptions.splice(idx, 1);
              cfg.exceptions.sort();
              Config.saveConfig(cfg);
              document.dispatchEvent(new CustomEvent("config-changed"));
              render(rootContainer);
            });
          }
          td.appendChild(btn);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    box.appendChild(table);
    return box;
  }

  function render(container) {
    const cfg = Config.ensureConfig();
    const s = ensureState();
    container.innerHTML = "";

    const controls = document.createElement("div");
    controls.className = "settings-body";
    controls.innerHTML = `
      <label>Afficher 12 mois à partir de
        <input type="month" id="cp-start-month" value="${s.startYear}-${String(s.startMonth + 1).padStart(2, "0")}" />
      </label>
      <button type="button" class="btn btn-ghost" id="cp-clear">Tout effacer</button>
      <span class="muted" id="cp-count"></span>
    `;
    container.appendChild(controls);

    controls.querySelector("#cp-start-month").addEventListener("change", (e) => {
      if (!e.target.value) return;
      const [y, m] = e.target.value.split("-").map(Number);
      s.startYear = y;
      s.startMonth = m - 1;
      render(container);
    });
    controls.querySelector("#cp-clear").addEventListener("click", () => {
      if (confirm("Effacer tous les jours marqués comme sans école ?")) {
        cfg.exceptions = [];
        Config.saveConfig(cfg);
        document.dispatchEvent(new CustomEvent("config-changed"));
        render(container);
      }
    });
    controls.querySelector("#cp-count").textContent = `${cfg.exceptions.length} jour(s) marqué(s) au total.`;

    const grid = document.createElement("div");
    grid.className = "mini-month-grid-wrap";
    monthsFrom(s.startYear, s.startMonth, 12).forEach(({ year, month }) => {
      grid.appendChild(renderMonth(cfg, year, month, container));
    });
    container.appendChild(grid);
  }

  window.CalendarPicker = { render };
})();
