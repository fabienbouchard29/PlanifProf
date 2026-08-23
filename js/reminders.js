(function () {
  function getReminders() {
    return Store.get("reminders", []);
  }
  function saveReminders(list) {
    Store.set("reminders", list);
  }
  function addReminder(date, time, title, notes) {
    const list = getReminders();
    list.push({ id: Store.uuid(), date, time: time || "", title, notes: notes || "" });
    saveReminders(list);
  }
  function updateReminder(id, patch) {
    saveReminders(getReminders().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeReminder(id) {
    saveReminders(getReminders().filter((r) => r.id !== id));
  }
  function remindersForDate(iso) {
    return getReminders()
      .filter((r) => r.date === iso)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }
  function addDaysIso(iso, days) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function upcomingReminders(fromIso, days) {
    const toIso = addDaysIso(fromIso, days);
    return getReminders()
      .filter((r) => r.date >= fromIso && r.date <= toIso)
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  }

  function openReminderModal(iso, existing) {
    const modal = document.getElementById("reminder-modal");
    modal.querySelector(".modal-title").textContent = existing ? "Modifier le rappel" : `Nouveau rappel — ${iso}`;
    const form = modal.querySelector("#reminder-form");
    form.title.value = existing ? existing.title : "";
    form.time.value = existing ? existing.time : "";
    form.notes.value = existing ? existing.notes : "";
    modal.querySelector("#reminder-delete").style.display = existing ? "inline-block" : "none";
    modal.classList.add("open");

    form.onsubmit = (e) => {
      e.preventDefault();
      if (!form.title.value.trim()) return;
      if (existing) {
        updateReminder(existing.id, { title: form.title.value.trim(), time: form.time.value, notes: form.notes.value.trim() });
      } else {
        addReminder(iso, form.time.value, form.title.value.trim(), form.notes.value.trim());
      }
      modal.classList.remove("open");
      if (window.rerenderCurrentView) window.rerenderCurrentView();
    };
    modal.querySelector("#reminder-delete").onclick = () => {
      if (existing) removeReminder(existing.id);
      modal.classList.remove("open");
      if (window.rerenderCurrentView) window.rerenderCurrentView();
    };
    modal.querySelector(".modal-close").onclick = () => modal.classList.remove("open");
  }

  function renderDayReminders(container, iso) {
    const box = document.createElement("div");
    box.className = "day-reminders";
    remindersForDate(iso).forEach((r) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "reminder-chip";
      chip.textContent = `🔔 ${r.time ? r.time + " " : ""}${r.title}`;
      chip.title = r.notes || "";
      chip.addEventListener("click", () => openReminderModal(iso, r));
      box.appendChild(chip);
    });
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "reminder-add-btn";
    addBtn.textContent = "+ Rappel";
    addBtn.addEventListener("click", () => openReminderModal(iso, null));
    box.appendChild(addBtn);
    container.appendChild(box);
  }

  function renderUpcomingWidget(container) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const reminderItems = upcomingReminders(todayIso, 7).map((r) => ({ date: r.date, time: r.time, title: r.title, kind: "rappel" }));

    const events = CalendarView.getEvents();
    const to = addDaysIso(todayIso, 7);
    const eventItems = Object.entries(events)
      .filter(([, ev]) => ev.title)
      .map(([key, ev]) => ({ date: key.split("::")[0], time: "", title: ev.title, kind: "cours" }))
      .filter((item) => item.date >= todayIso && item.date <= to);

    const outlookItems = (window.OutlookSync ? OutlookSync.upcoming(todayIso, 7) : []).map((e) => ({ date: e.date, time: e.time, title: e.title, kind: "teams" }));

    const items = [...reminderItems, ...outlookItems, ...eventItems].sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

    if (!items.length) return;

    const box = document.createElement("div");
    box.className = "upcoming-widget";
    box.innerHTML = `<div class="upcoming-title">🔔 À venir (7 prochains jours)</div>`;
    const list = document.createElement("div");
    list.className = "upcoming-list";
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "upcoming-row";
      const d = new Date(item.date + "T00:00:00");
      const dateLabel = d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });
      row.innerHTML = `<span class="upcoming-date">${dateLabel}${item.time ? " · " + item.time : ""}</span><span class="upcoming-item-title">${item.title}</span>`;
      list.appendChild(row);
    });
    box.appendChild(list);
    container.appendChild(box);
  }

  window.Reminders = { getReminders, addReminder, updateReminder, removeReminder, remindersForDate, upcomingReminders, renderDayReminders, renderUpcomingWidget, openReminderModal };
})();
