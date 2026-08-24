(function () {
  function getAttendance() {
    return Store.get("attendance", {});
  }
  function saveAttendance(a) {
    Store.set("attendance", a);
  }
  function keyFor(groupId, iso) {
    return groupId + "::" + iso;
  }

  const STATUS_LABELS = { present: "Présent", late: "Retard", absent: "Absent" };

  let selectedGroupId = null;
  let selectedDate = null;

  function render(container) {
    container.innerHTML = "";
    const groups = Students.getGroups();
    if (!groups.length) {
      EmptyState.render(container, {
        icon: "🧑‍🎓",
        text: "Vous n'avez pas encore de groupe. Créez-en un pour commencer à prendre les présences.",
        ctaLabel: "Créer mon premier groupe",
        onClick: () => AppNav.showSubView("sub-groupes"),
      });
      return;
    }
    if (!selectedGroupId) selectedGroupId = groups[0].id;
    if (!selectedDate) selectedDate = new Date().toISOString().slice(0, 10);

    const controls = document.createElement("div");
    controls.className = "attendance-controls";
    controls.innerHTML = `
      <select id="att-group">${groups.map((g) => `<option value="${g.id}" ${g.id === selectedGroupId ? "selected" : ""}>${g.name}</option>`).join("")}</select>
      <input type="date" id="att-date" value="${selectedDate}" />
      <button type="button" class="btn btn-ghost no-print" id="att-all-present">✅ Tout marquer présent</button>
      <button type="button" class="btn btn-ghost no-print" id="att-clear-day">Effacer ce jour</button>
      <button type="button" class="btn btn-ghost no-print" id="att-print">🖨️ Imprimer</button>
    `;
    container.appendChild(controls);

    controls.querySelector("#att-group").addEventListener("change", (e) => {
      selectedGroupId = e.target.value;
      render(container);
    });
    controls.querySelector("#att-date").addEventListener("change", (e) => {
      if (!e.target.value) return;
      selectedDate = e.target.value;
      render(container);
    });
    controls.querySelector("#att-print").addEventListener("click", () => Exports.printSchedule());

    const students = Students.studentsInGroup(selectedGroupId);
    const attendance = getAttendance();
    const key = keyFor(selectedGroupId, selectedDate);
    const dayRecord = attendance[key] || {};

    controls.querySelector("#att-all-present").addEventListener("click", () => {
      const a = getAttendance();
      const rec = {};
      students.forEach((s) => (rec[s.id] = "present"));
      a[key] = rec;
      saveAttendance(a);
      render(container);
    });
    controls.querySelector("#att-clear-day").addEventListener("click", () => {
      const a = getAttendance();
      delete a[key];
      saveAttendance(a);
      render(container);
    });

    if (!students.length) {
      EmptyState.render(container, {
        icon: "➕",
        text: "Ce groupe n'a pas encore d'élèves. Ajoutez-en quelques-uns pour commencer.",
        ctaLabel: "Ajouter des élèves",
        onClick: () => AppNav.showSubView("sub-groupes"),
      });
      return;
    }

    const list = document.createElement("div");
    list.className = "attendance-list";
    students.forEach((s) => {
      const status = dayRecord[s.id] || null;
      const row = document.createElement("div");
      row.className = "attendance-row";
      row.innerHTML = `
        <span class="attendance-name">${s.name}</span>
        <div class="attendance-buttons">
          <button type="button" class="att-btn present ${status === "present" ? "active" : ""}" data-status="present">Présent</button>
          <button type="button" class="att-btn late ${status === "late" ? "active" : ""}" data-status="late">Retard</button>
          <button type="button" class="att-btn absent ${status === "absent" ? "active" : ""}" data-status="absent">Absent</button>
        </div>
      `;
      row.querySelectorAll(".att-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const a = getAttendance();
          if (!a[key]) a[key] = {};
          const newStatus = btn.dataset.status;
          if (a[key][s.id] === newStatus) delete a[key][s.id];
          else a[key][s.id] = newStatus;
          saveAttendance(a);
          render(container);
        });
      });
      list.appendChild(row);
    });
    container.appendChild(list);

    const counts = { present: 0, absent: 0, late: 0 };
    students.forEach((s) => {
      const st = dayRecord[s.id];
      if (st) counts[st]++;
    });
    const unmarked = students.length - counts.present - counts.absent - counts.late;
    const summary = document.createElement("p");
    summary.className = "muted";
    summary.textContent = `${counts.present} présent(s) · ${counts.late} retard(s) · ${counts.absent} absent(s)${unmarked ? ` · ${unmarked} non marqué(s)` : ""}`;
    container.appendChild(summary);

    const statsSection = document.createElement("details");
    statsSection.className = "settings-panel";
    statsSection.innerHTML = "<summary>Statistiques du groupe (cumulatif)</summary>";
    const statsBody = document.createElement("div");
    statsBody.style.marginTop = "0.75rem";
    const totals = {};
    students.forEach((s) => (totals[s.id] = { present: 0, absent: 0, late: 0 }));
    Object.entries(attendance).forEach(([k, rec]) => {
      if (!k.startsWith(selectedGroupId + "::")) return;
      Object.entries(rec).forEach(([studentId, status]) => {
        if (totals[studentId]) totals[studentId][status]++;
      });
    });
    const table = document.createElement("table");
    table.className = "student-table";
    table.innerHTML = "<thead><tr><th>Élève</th><th>Présences</th><th>Retards</th><th>Absences</th></tr></thead>";
    const tbody = document.createElement("tbody");
    students.forEach((s) => {
      const t = totals[s.id];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${s.name}</td><td>${t.present}</td><td>${t.late}</td><td>${t.absent}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    statsBody.appendChild(table);
    statsSection.appendChild(statsBody);
    container.appendChild(statsSection);
  }

  window.Attendance = { render, getAttendance, STATUS_LABELS };
})();
