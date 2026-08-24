(function () {
  function getGroups() {
    return Store.get("groups", []);
  }
  function saveGroups(g) {
    Store.set("groups", g);
  }
  function getStudents() {
    return Store.get("students", []);
  }
  function saveStudents(s) {
    Store.set("students", s);
  }

  function addGroup(name) {
    const groups = getGroups();
    groups.push({ id: Store.uuid(), name });
    saveGroups(groups);
  }
  function removeGroup(id) {
    saveGroups(getGroups().filter((g) => g.id !== id));
    saveStudents(getStudents().filter((s) => s.groupId !== id));
  }
  function addStudent(groupId, name, gender, level) {
    const students = getStudents();
    students.push({ id: Store.uuid(), groupId, name, gender, level: Number(level) || 3 });
    saveStudents(students);
  }
  function updateStudent(id, patch) {
    saveStudents(getStudents().map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeStudent(id) {
    saveStudents(getStudents().filter((s) => s.id !== id));
  }
  function studentsInGroup(groupId) {
    return getStudents().filter((s) => s.groupId === groupId);
  }

  let selectedGroupId = null;

  function render(container) {
    container.innerHTML = "";
    const groups = getGroups();
    if (!selectedGroupId && groups.length) selectedGroupId = groups[0].id;

    const wrap = document.createElement("div");
    wrap.className = "group-layout";

    const sidebar = document.createElement("div");
    sidebar.className = "group-sidebar no-print";
    sidebar.innerHTML = `<h3>Groupes</h3>`;
    const list = document.createElement("div");
    list.className = "group-list";
    groups.forEach((g) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "group-item" + (g.id === selectedGroupId ? " active" : "");
      btn.textContent = g.name;
      btn.addEventListener("click", () => {
        selectedGroupId = g.id;
        render(container);
      });
      list.appendChild(btn);
    });
    sidebar.appendChild(list);

    const addForm = document.createElement("form");
    addForm.className = "group-add-form";
    addForm.innerHTML = `<input type="text" placeholder="Nouveau groupe…" required /><button class="btn btn-primary" type="submit">+</button>`;
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = addForm.querySelector("input");
      if (!input.value.trim()) return;
      addGroup(input.value.trim());
      input.value = "";
      render(container);
    });
    sidebar.appendChild(addForm);

    const main = document.createElement("div");
    main.className = "group-main";

    if (!selectedGroupId) {
      EmptyState.render(main, {
        icon: "👋",
        text: "Bienvenue ! Ajoutez votre premier groupe à gauche pour commencer.",
      });
    } else {
      const group = groups.find((g) => g.id === selectedGroupId);
      const header = document.createElement("div");
      header.className = "group-main-header";
      header.innerHTML = `<h3>${group.name}</h3>`;
      const printBtn = document.createElement("button");
      printBtn.type = "button";
      printBtn.className = "btn btn-ghost no-print";
      printBtn.textContent = "🖨️ Imprimer";
      printBtn.addEventListener("click", () => Exports.printSchedule());
      header.appendChild(printBtn);
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-ghost no-print";
      removeBtn.textContent = "Supprimer le groupe";
      removeBtn.addEventListener("click", () => {
        if (confirm(`Supprimer le groupe "${group.name}" et tous ses élèves ?`)) {
          removeGroup(group.id);
          selectedGroupId = null;
          render(container);
        }
      });
      header.appendChild(removeBtn);
      main.appendChild(header);

      const table = document.createElement("table");
      table.className = "student-table";
      table.innerHTML = "<thead><tr><th>Nom</th><th>Genre</th><th></th></tr></thead>";
      const tbody = document.createElement("tbody");
      studentsInGroup(group.id).forEach((s) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><input type="text" class="s-name" value="${s.name}" /></td>
          <td>
            <select class="s-gender">
              <option value="F" ${s.gender === "F" ? "selected" : ""}>F</option>
              <option value="M" ${s.gender === "M" ? "selected" : ""}>M</option>
              <option value="autre" ${s.gender === "autre" ? "selected" : ""}>Autre</option>
            </select>
          </td>
          <td><button type="button" class="btn btn-ghost btn-small s-remove">✕</button></td>
        `;
        tr.querySelector(".s-name").addEventListener("change", (e) => updateStudent(s.id, { name: e.target.value }));
        tr.querySelector(".s-gender").addEventListener("change", (e) => updateStudent(s.id, { gender: e.target.value }));
        tr.querySelector(".s-remove").addEventListener("click", () => {
          removeStudent(s.id);
          render(container);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      main.appendChild(table);

      const addStudentForm = document.createElement("form");
      addStudentForm.className = "add-student-form";
      addStudentForm.innerHTML = `
        <input type="text" name="name" placeholder="Nom de l'élève" required />
        <select name="gender"><option value="F">F</option><option value="M">M</option><option value="autre">Autre</option></select>
        <button class="btn btn-primary" type="submit">Ajouter l'élève</button>
      `;
      addStudentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        addStudent(group.id, addStudentForm.name.value.trim(), addStudentForm.gender.value, 3);
        addStudentForm.reset();
        render(container);
      });
      main.appendChild(addStudentForm);
    }

    wrap.appendChild(sidebar);
    wrap.appendChild(main);
    container.appendChild(wrap);
  }

  window.Students = {
    getGroups,
    getStudents,
    studentsInGroup,
    addGroup,
    removeGroup,
    addStudent,
    updateStudent,
    removeStudent,
    render,
  };
})();
