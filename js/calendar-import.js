(function () {
  const HOLIDAY_RE = /p[ée]dagog|cong[ée]|vacance|f[ée]ri[ée]|fermeture|rel[âa]che/i;
  const CYCLE_RE = /jour\s*0*([0-9]{1,2})\b/i;

  function unfoldICS(text) {
    return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  }

  function parseICS(text) {
    const lines = unfoldICS(text).split("\n");
    const events = [];
    let current = null;
    lines.forEach((line) => {
      if (line.startsWith("BEGIN:VEVENT")) {
        current = {};
      } else if (line.startsWith("END:VEVENT")) {
        if (current && current.date) events.push(current);
        current = null;
      } else if (current) {
        const idx = line.indexOf(":");
        if (idx === -1) return;
        const rawKey = line.slice(0, idx);
        const value = line.slice(idx + 1).trim();
        const key = rawKey.split(";")[0].toUpperCase();
        if (key === "SUMMARY") current.summary = value;
        if (key === "DTSTART") {
          const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
          if (m) current.date = `${m[1]}-${m[2]}-${m[3]}`;
        }
      }
    });
    return events;
  }

  function classify(events) {
    const exceptions = new Set();
    const cycleMap = {};
    let maxDay = 0;
    events.forEach((e) => {
      const summary = e.summary || "";
      if (HOLIDAY_RE.test(summary)) exceptions.add(e.date);
      const m = summary.match(CYCLE_RE);
      if (m) {
        const day = parseInt(m[1], 10);
        if (day >= 1 && day <= 30) {
          cycleMap[e.date] = day - 1;
          if (day > maxDay) maxDay = day;
        }
      }
    });
    return {
      exceptions: Array.from(exceptions).sort(),
      cycleMap,
      cycleDetected: Object.keys(cycleMap).length >= 5,
      cycleLength: maxDay,
    };
  }

  function applyImport(result) {
    const cfg = Config.ensureConfig();
    const mergedExceptions = new Set([...(cfg.exceptions || []), ...result.exceptions]);
    cfg.exceptions = Array.from(mergedExceptions).sort();

    if (result.cycleDetected) {
      cfg.mode = "cycle";
      cfg.cycleLength = result.cycleLength;
      cfg.cycleOverrides = Object.assign({}, cfg.cycleOverrides, result.cycleMap);
      const firstDay1 = Object.entries(result.cycleMap)
        .filter(([, idx]) => idx === 0)
        .map(([d]) => d)
        .sort()[0];
      if (firstDay1 && !cfg.cycleStartDate) cfg.cycleStartDate = firstDay1;
      Config.regenerateDays(cfg);
    }

    Config.saveConfig(cfg);
    document.dispatchEvent(new CustomEvent("config-changed"));
  }

  window.CalendarImport = { parseICS, classify, applyImport };
})();
