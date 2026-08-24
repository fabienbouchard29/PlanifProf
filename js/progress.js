(function () {
  function toISO(d) {
    return d.toISOString().slice(0, 10);
  }

  function schoolYearStart() {
    const now = new Date();
    const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return new Date(year, 8, 1);
  }

  // Returns { [subjectId]: { total, taught } } for every non-break period scheduled
  // between fromDate and toDate (inclusive), counting overrides from actual agenda events
  // over the template's default subject assignment.
  function computeProgress(fromDate, toDate) {
    const events = CalendarView.getEvents();
    const assignments = TemplateView.getAssignments();
    const stats = {};
    const cursor = new Date(fromDate);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);
    let safety = 0;
    while (cursor <= end && safety < 3660) {
      const dIso = toISO(cursor);
      const templateDay = Config.getTemplateDayForDate(cursor);
      if (templateDay) {
        templateDay.periods.forEach((period) => {
          if (period.type === "break") return;
          const ev = events[dIso + "::" + period.id];
          const subjId = (ev && ev.subjectId) || assignments[TemplateView.keyFor(templateDay.id, period.id)];
          if (!subjId) return;
          if (!stats[subjId]) stats[subjId] = { total: 0, taught: 0 };
          stats[subjId].total++;
          if (ev && ev.taught) stats[subjId].taught++;
        });
      }
      cursor.setDate(cursor.getDate() + 1);
      safety++;
    }
    return stats;
  }

  function renderModal(fromDate, toDate) {
    const modal = document.getElementById("progress-modal");
    const body = modal.querySelector("#progress-body");
    const fromInput = modal.querySelector("#progress-from");
    const toInput = modal.querySelector("#progress-to");
    fromInput.value = toISO(fromDate);
    toInput.value = toISO(toDate);

    const stats = computeProgress(fromDate, toDate);
    const subjects = Subjects.getSubjects();
    const rows = subjects
      .map((s) => ({ subject: s, stat: stats[s.id] }))
      .filter((r) => r.stat && r.stat.total > 0);

    if (!rows.length) {
      body.innerHTML = '<p class="muted">Aucune période avec une matière assignée dans cette période de temps.</p>';
      return;
    }

    body.innerHTML = rows
      .map(({ subject, stat }) => {
        const pct = Math.round((stat.taught / stat.total) * 100);
        return `
          <div class="progress-row">
            <div class="progress-row-label">
              <span class="progress-row-dot" style="background:${subject.color}"></span>
              <strong>${subject.name}</strong>
              <span class="muted">${stat.taught}/${stat.total} périodes (${pct}%)</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${pct}%; background:${subject.color}"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function openModal() {
    const modal = document.getElementById("progress-modal");
    modal.classList.add("open");
    let fromDate = schoolYearStart();
    let toDate = new Date();
    renderModal(fromDate, toDate);

    modal.querySelector("#progress-from").onchange = (e) => {
      if (!e.target.value) return;
      fromDate = new Date(e.target.value + "T00:00:00");
      renderModal(fromDate, toDate);
    };
    modal.querySelector("#progress-to").onchange = (e) => {
      if (!e.target.value) return;
      toDate = new Date(e.target.value + "T00:00:00");
      renderModal(fromDate, toDate);
    };
    modal.querySelector(".modal-close").onclick = () => modal.classList.remove("open");
  }

  window.Progress = { computeProgress, schoolYearStart, openModal };
})();
