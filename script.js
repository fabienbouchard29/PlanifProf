const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
const PERIODS = [
  "8h30 - 9h20",
  "9h25 - 10h15",
  "10h30 - 11h20",
  "11h25 - 12h15",
  "13h15 - 14h05",
  "14h10 - 15h00",
];

const SCHEDULE_KEY = "planifprof.schedule";
const TASKS_KEY = "planifprof.tasks";

function loadSchedule() {
  const raw = localStorage.getItem(SCHEDULE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveSchedule(schedule) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

function loadTasks() {
  const raw = localStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function renderSchedule() {
  const schedule = loadSchedule();
  const tbody = document.querySelector("#schedule-table tbody");
  tbody.innerHTML = "";

  PERIODS.forEach((periodLabel, periodIndex) => {
    const row = document.createElement("tr");

    const periodCell = document.createElement("td");
    periodCell.textContent = periodLabel;
    row.appendChild(periodCell);

    DAYS.forEach((day) => {
      const cell = document.createElement("td");
      const textarea = document.createElement("textarea");
      textarea.className = "cell-input";
      textarea.dataset.day = day;
      textarea.dataset.period = periodIndex;
      textarea.value = schedule[`${day}-${periodIndex}`] || "";
      textarea.addEventListener("input", () => {
        const current = loadSchedule();
        current[`${day}-${periodIndex}`] = textarea.value;
        saveSchedule(current);
      });
      cell.appendChild(textarea);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });
}

function renderTasks() {
  const tasks = loadTasks();
  const list = document.getElementById("task-list");
  list.innerHTML = "";

  const order = { haute: 0, normale: 1, basse: 2 };
  const sorted = [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);

  sorted.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item" + (task.done ? " done" : "");

    const dot = document.createElement("span");
    dot.className = `priority-dot ${task.priority}`;
    item.appendChild(dot);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      toggleTask(task.id);
    });
    item.appendChild(checkbox);

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;
    item.appendChild(text);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "task-delete";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Supprimer la tâche";
    deleteBtn.addEventListener("click", () => {
      removeTask(task.id);
    });
    item.appendChild(deleteBtn);

    list.appendChild(item);
  });
}

function addTask(text, priority) {
  const tasks = loadTasks();
  tasks.push({ id: crypto.randomUUID(), text, priority, done: false });
  saveTasks(tasks);
  renderTasks();
}

function toggleTask(id) {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  saveTasks(tasks);
  renderTasks();
}

function removeTask(id) {
  const tasks = loadTasks().filter((t) => t.id !== id);
  saveTasks(tasks);
  renderTasks();
}

document.getElementById("task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("task-input");
  const priority = document.getElementById("task-priority").value;
  const value = input.value.trim();
  if (!value) return;
  addTask(value, priority);
  input.value = "";
  input.focus();
});

document.getElementById("clear-schedule").addEventListener("click", () => {
  if (confirm("Vider tout l'horaire de la semaine ?")) {
    saveSchedule({});
    renderSchedule();
  }
});

renderSchedule();
renderTasks();
