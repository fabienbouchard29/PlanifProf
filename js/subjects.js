(function () {
  const DEFAULT_SUBJECTS = [
    { id: "math", name: "Mathématiques", color: "#3457d5" },
    { id: "fr", name: "Français", color: "#d64545" },
    { id: "sci", name: "Sciences", color: "#2f9e44" },
    { id: "eps", name: "Éducation physique", color: "#f08c00" },
    { id: "art", name: "Arts", color: "#ae3ec9" },
  ];

  function getSubjects() {
    return Store.get("subjects", DEFAULT_SUBJECTS);
  }
  function saveSubjects(list) {
    Store.set("subjects", list);
  }
  function addSubject(name, color) {
    const list = getSubjects();
    list.push({ id: Store.uuid(), name, color });
    saveSubjects(list);
  }
  function updateSubject(id, patch) {
    saveSubjects(getSubjects().map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeSubject(id) {
    saveSubjects(getSubjects().filter((s) => s.id !== id));
  }
  function getSubject(id) {
    return getSubjects().find((s) => s.id === id);
  }

  function renderManager(container) {
    container.innerHTML = "";
    const list = getSubjects();
    const ul = document.createElement("div");
    ul.className = "subject-list";
    list.forEach((s) => {
      const row = document.createElement("div");
      row.className = "subject-row";
      row.innerHTML = `
        <input type="color" value="${s.color}" class="subject-color" />
        <input type="text" value="${s.name}" class="subject-name" />
        <button type="button" class="btn btn-ghost btn-small subject-remove">Supprimer</button>
      `;
      row.querySelector(".subject-color").addEventListener("input", (e) => {
        updateSubject(s.id, { color: e.target.value });
        document.dispatchEvent(new CustomEvent("subjects-changed"));
      });
      row.querySelector(".subject-name").addEventListener("change", (e) => {
        updateSubject(s.id, { name: e.target.value });
        document.dispatchEvent(new CustomEvent("subjects-changed"));
      });
      row.querySelector(".subject-remove").addEventListener("click", () => {
        removeSubject(s.id);
        renderManager(container);
        document.dispatchEvent(new CustomEvent("subjects-changed"));
      });
      ul.appendChild(row);
    });
    container.appendChild(ul);

    const addRow = document.createElement("div");
    addRow.className = "subject-add-row";
    addRow.innerHTML = `
      <input type="color" id="new-subject-color" value="#3457d5" />
      <input type="text" id="new-subject-name" placeholder="Nouvelle matière ou groupe…" />
      <button type="button" class="btn btn-primary btn-small" id="add-subject-btn">Ajouter</button>
    `;
    container.appendChild(addRow);
    addRow.querySelector("#add-subject-btn").addEventListener("click", () => {
      const nameEl = addRow.querySelector("#new-subject-name");
      const colorEl = addRow.querySelector("#new-subject-color");
      if (!nameEl.value.trim()) return;
      addSubject(nameEl.value.trim(), colorEl.value);
      renderManager(container);
      document.dispatchEvent(new CustomEvent("subjects-changed"));
    });
  }

  window.Subjects = { getSubjects, saveSubjects, addSubject, updateSubject, removeSubject, getSubject, renderManager };
})();
