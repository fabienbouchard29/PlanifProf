(function () {
  let selectedGroupId = null;

  function getHistory() {
    return Store.get("pickerHistory", {});
  }
  function saveHistory(h) {
    Store.set("pickerHistory", h);
  }

  function render(container) {
    container.innerHTML = "";
    const groups = Students.getGroups();
    if (!groups.length) {
      container.innerHTML = '<p class="muted">Créez d\'abord un groupe dans l\'onglet Élèves.</p>';
      return;
    }
    if (!selectedGroupId) selectedGroupId = groups[0].id;

    const select = document.createElement("select");
    groups.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      if (g.id === selectedGroupId) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      selectedGroupId = select.value;
      render(container);
    });
    container.appendChild(select);

    const students = Students.studentsInGroup(selectedGroupId);
    const history = getHistory();
    const picked = history[selectedGroupId] || [];
    const remaining = students.filter((s) => !picked.includes(s.id));

    const display = document.createElement("div");
    display.className = "picker-display";
    display.textContent = remaining.length ? "Prêt à piger…" : "Tous les élèves ont été pigés !";
    container.appendChild(display);

    const btnRow = document.createElement("div");
    btnRow.className = "picker-buttons";
    const pickBtn = document.createElement("button");
    pickBtn.type = "button";
    pickBtn.className = "btn btn-primary";
    pickBtn.textContent = "🎲 Piger un élève";
    pickBtn.disabled = students.length === 0;
    pickBtn.addEventListener("click", () => {
      const pool = remaining.length ? remaining : students;
      if (!pool.length) return;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      const h = getHistory();
      if (!h[selectedGroupId]) h[selectedGroupId] = [];
      if (!h[selectedGroupId].includes(chosen.id)) h[selectedGroupId].push(chosen.id);
      saveHistory(h);
      render(container);
      container.querySelector(".picker-display").textContent = chosen.name;
    });
    btnRow.appendChild(pickBtn);

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-ghost";
    resetBtn.textContent = "Réinitialiser la liste";
    resetBtn.addEventListener("click", () => {
      const h = getHistory();
      h[selectedGroupId] = [];
      saveHistory(h);
      render(container);
    });
    btnRow.appendChild(resetBtn);
    container.appendChild(btnRow);

    const info = document.createElement("p");
    info.className = "muted";
    info.textContent = `${picked.length} / ${students.length} élèves déjà pigés dans ce tour.`;
    container.appendChild(info);
  }

  window.Picker = { render };
})();
