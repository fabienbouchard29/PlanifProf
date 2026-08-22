(function () {
  function getEvaluations() {
    return Store.get("evaluations", []);
  }
  function saveEvaluations(e) {
    Store.set("evaluations", e);
  }
  function getResults() {
    return Store.get("evalResults", {});
  }
  function saveResults(r) {
    Store.set("evalResults", r);
  }

  let selectedGroupId = null;
  let selectedEvalId = null;

  function render(container) {
    container.innerHTML = "";
    const groups = Students.getGroups();
    if (!groups.length) {
      container.innerHTML = '<p class="muted">Créez d\'abord un groupe dans l\'onglet Élèves.</p>';
      return;
    }
    if (!selectedGroupId) selectedGroupId = groups[0].id;

    const groupSelect = document.createElement("select");
    groups.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      if (g.id === selectedGroupId) opt.selected = true;
      groupSelect.appendChild(opt);
    });
    groupSelect.addEventListener("change", () => {
      selectedGroupId = groupSelect.value;
      selectedEvalId = null;
      render(container);
    });
    container.appendChild(groupSelect);

    const evals = getEvaluations().filter((e) => e.groupId === selectedGroupId);

    const addForm = document.createElement("form");
    addForm.className = "eval-add-form";
    addForm.innerHTML = `
      <input type="text" name="title" placeholder="Titre de l'évaluation" required />
      <input type="date" name="date" />
      <input type="number" name="max" placeholder="Note max" value="100" min="1" />
      <button class="btn btn-primary" type="submit">Créer l'évaluation</button>
    `;
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const list = getEvaluations();
      const id = Store.uuid();
      list.push({ id, groupId: selectedGroupId, title: addForm.title.value.trim(), date: addForm.date.value, max: Number(addForm.max.value) || 100 });
      saveEvaluations(list);
      selectedEvalId = id;
      addForm.reset();
      render(container);
    });
    container.appendChild(addForm);

    const tabs = document.createElement("div");
    tabs.className = "eval-tabs";
    evals.forEach((ev) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (ev.id === selectedEvalId ? " chip-active" : "");
      btn.textContent = ev.title;
      btn.addEventListener("click", () => {
        selectedEvalId = ev.id;
        render(container);
      });
      tabs.appendChild(btn);
    });
    container.appendChild(tabs);

    if (!selectedEvalId && evals.length) selectedEvalId = evals[0].id;
    const currentEval = evals.find((e) => e.id === selectedEvalId);
    if (!currentEval) return;

    const students = Students.studentsInGroup(selectedGroupId);
    const results = getResults();
    const evalResults = results[currentEval.id] || {};

    const table = document.createElement("table");
    table.className = "student-table";
    table.innerHTML = `<thead><tr><th>Élève</th><th>Note (/${currentEval.max})</th></tr></thead>`;
    const tbody = document.createElement("tbody");
    students.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${s.name}</td><td><input type="number" min="0" max="${currentEval.max}" value="${evalResults[s.id] ?? ""}" class="eval-score" /></td>`;
      tr.querySelector(".eval-score").addEventListener("change", (e) => {
        const r = getResults();
        if (!r[currentEval.id]) r[currentEval.id] = {};
        r[currentEval.id][s.id] = Number(e.target.value);
        saveResults(r);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "Supprimer cette évaluation";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Supprimer cette évaluation ?")) {
        saveEvaluations(getEvaluations().filter((e) => e.id !== currentEval.id));
        selectedEvalId = null;
        render(container);
      }
    });
    container.appendChild(deleteBtn);
  }

  window.Evaluations = { render, getEvaluations, getResults };
})();
