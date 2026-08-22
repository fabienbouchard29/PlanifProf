(function () {
  function exportJSON() {
    const data = {};
    Store.allKeys().forEach((k) => {
      const shortKey = k.slice(Store.PREFIX.length);
      data[shortKey] = JSON.parse(localStorage.getItem(k));
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planifprof-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSON(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.entries(data).forEach(([key, value]) => Store.set(key, value));
        cb(true);
      } catch (e) {
        cb(false, e);
      }
    };
    reader.readAsText(file);
  }

  function exportICS() {
    const events = CalendarView.getEvents();
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PlanifProf//FR"];
    Object.entries(events).forEach(([key, ev]) => {
      const [iso] = key.split("::");
      if (!ev.title) return;
      const dt = iso.replace(/-/g, "");
      lines.push("BEGIN:VEVENT");
      lines.push("UID:" + key + "@planifprof");
      lines.push("DTSTART;VALUE=DATE:" + dt);
      lines.push("SUMMARY:" + ev.title.replace(/\n/g, " "));
      if (ev.notes) lines.push("DESCRIPTION:" + ev.notes.replace(/\n/g, " "));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "planifprof.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printSchedule() {
    window.print();
  }

  window.Exports = { exportJSON, importJSON, exportICS, printSchedule };
})();
