(function () {
  const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

  let viewYear;
  let viewMonth;

  function toISO(d) {
    return d.toISOString().slice(0, 10);
  }

  function buildCells(year, month) {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function dayInfo(dIso) {
    const exceptionType = Config.getExceptionType(dIso);
    const events = CalendarView.getEvents();
    const subjectIds = new Set();
    Object.entries(events).forEach(([key, ev]) => {
      if (!key.startsWith(dIso + "::")) return;
      if (ev.subjectId) subjectIds.add(ev.subjectId);
    });
    const reminderCount = Reminders.remindersForDate(dIso).length;
    return { exceptionType, subjectIds: Array.from(subjectIds), reminderCount };
  }

  function render(container) {
    const now = new Date();
    if (viewYear === undefined) {
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
    }
    container.innerHTML = "";

    const nav = document.createElement("div");
    nav.className = "month-overview-nav";
    nav.innerHTML = `
      <button type="button" class="cal-nav-icon" id="mo-prev">◀</button>
      <h3>${MONTH_NAMES[viewMonth]} ${viewYear}</h3>
      <button type="button" class="cal-nav-icon" id="mo-next">▶</button>
    `;
    container.appendChild(nav);
    nav.querySelector("#mo-prev").addEventListener("click", () => {
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      render(container);
    });
    nav.querySelector("#mo-next").addEventListener("click", () => {
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      render(container);
    });

    const table = document.createElement("table");
    table.className = "month-overview-table";
    table.innerHTML = "<thead><tr>" + DOW_LABELS.map((d) => `<th>${d}</th>`).join("") + "</tr></thead>";
    const tbody = document.createElement("tbody");
    const cells = buildCells(viewYear, viewMonth);
    const todayIso = toISO(now);
    for (let i = 0; i < cells.length; i += 7) {
      const tr = document.createElement("tr");
      cells.slice(i, i + 7).forEach((date) => {
        const td = document.createElement("td");
        if (date) {
          const dIso = toISO(date);
          const info = dayInfo(dIso);
          const cell = document.createElement("div");
          cell.className = "mo-day" + (dIso === todayIso ? " today" : "");
          if (info.exceptionType) cell.style.background = info.exceptionType.color + "22";
          cell.innerHTML = `
            <span class="mo-day-num">${date.getDate()}${info.exceptionType ? ` ${info.exceptionType.icon}` : ""}</span>
            <span class="mo-day-dots">${info.subjectIds
              .slice(0, 5)
              .map((id) => {
                const s = Subjects.getSubject(id);
                return s ? `<span class="mo-dot" style="background:${s.color}" title="${s.name}"></span>` : "";
              })
              .join("")}</span>
            ${info.reminderCount ? `<span class="mo-day-reminder">🔔${info.reminderCount}</span>` : ""}
          `;
          td.appendChild(cell);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function openModal() {
    const modal = document.getElementById("month-overview-modal");
    modal.classList.add("open");
    render(modal.querySelector("#month-overview-body"));
    modal.querySelector(".modal-close").onclick = () => modal.classList.remove("open");
  }

  window.MonthOverview = { openModal };
})();
