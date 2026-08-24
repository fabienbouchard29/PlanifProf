(function () {
  function getTasks() {
    return Store.get("gradingTasks", []);
  }
  function saveTasks(t) {
    Store.set("gradingTasks", t);
  }
  function addTask(title, dueDate) {
    const tasks = getTasks();
    tasks.push({ id: Store.uuid(), title, dueDate: dueDate || "", done: false });
    saveTasks(tasks);
  }
  function toggleTask(id) {
    const tasks = getTasks();
    const t = tasks.find((x) => x.id === id);
    if (t) t.done = !t.done;
    saveTasks(tasks);
  }
  function removeTask(id) {
    saveTasks(getTasks().filter((x) => x.id !== id));
  }

  function render(container) {
    const box = document.createElement("div");
    box.className = "grading-box";
    box.innerHTML = `<h3>📥 À corriger</h3>`;

    const form = document.createElement("form");
    form.className = "grading-add-form";
    form.innerHTML = `
      <input type="text" name="title" placeholder="Ex. Dictée 3e année" required />
      <input type="date" name="dueDate" />
      <button class="btn btn-primary" type="submit">Ajouter</button>
    `;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      addTask(form.title.value.trim(), form.dueDate.value);
      form.reset();
      renderList();
    });
    box.appendChild(form);

    const listBox = document.createElement("div");
    listBox.className = "grading-list";
    box.appendChild(listBox);

    function renderList() {
      const tasks = getTasks().sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99");
      });
      listBox.innerHTML = "";
      if (!tasks.length) {
        EmptyState.render(listBox, { icon: "📥", text: "Rien à corriger pour l'instant — profitez-en !" });
        return;
      }
      tasks.forEach((t) => {
        const row = document.createElement("div");
        row.className = "grading-row" + (t.done ? " done" : "");
        row.innerHTML = `
          <label class="grading-check">
            <input type="checkbox" ${t.done ? "checked" : ""} />
            <span>${t.title}</span>
          </label>
          ${t.dueDate ? `<span class="muted grading-due">📅 ${t.dueDate}</span>` : ""}
          <button type="button" class="btn btn-ghost btn-small grading-remove">✕</button>
        `;
        row.querySelector('input[type="checkbox"]').addEventListener("change", () => {
          toggleTask(t.id);
          renderList();
        });
        row.querySelector(".grading-remove").addEventListener("click", () => {
          removeTask(t.id);
          renderList();
        });
        listBox.appendChild(row);
      });
    }
    renderList();
    container.appendChild(box);
  }

  window.Grading = { render };
})();
