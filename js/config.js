(function () {
  const EXCEPTION_TYPES = [
    { key: "pedago", label: "Pédagogique", color: "#f08c00" },
    { key: "conge", label: "Congé", color: "#d64545" },
  ];

  function toISODate(d) {
    return d.toISOString().slice(0, 10);
  }
  function parseISODate(s) {
    return new Date(s + "T00:00:00");
  }

  function getConfig() {
    return Store.get("config", null);
  }
  function saveConfig(cfg) {
    Store.set("config", cfg);
  }

  function buildDefaultDays(mode, cycleLength) {
    if (mode === "weekday") {
      return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].map((label, i) => ({
        id: "d" + i,
        label,
        periods: [],
      }));
    }
    const n = cycleLength || 9;
    return Array.from({ length: n }, (_, i) => ({ id: "d" + i, label: "Jour " + (i + 1), periods: [] }));
  }

  function ensureConfig() {
    let cfg = getConfig();
    if (!cfg) {
      cfg = { mode: "weekday", cycleLength: 9, cycleStartDate: "", exceptions: [], cycleOverrides: {}, exceptionTypes: {}, days: buildDefaultDays("weekday") };
      saveConfig(cfg);
    }
    if (!cfg.exceptions) cfg.exceptions = [];
    if (!cfg.cycleOverrides) cfg.cycleOverrides = {};
    if (!cfg.exceptionTypes) cfg.exceptionTypes = {};
    return cfg;
  }

  function getExceptionType(iso) {
    const cfg = getConfig();
    const key = cfg && cfg.exceptionTypes && cfg.exceptionTypes[iso];
    return EXCEPTION_TYPES.find((t) => t.key === key) || null;
  }

  function regenerateDays(cfg) {
    const newDays = buildDefaultDays(cfg.mode, cfg.cycleLength);
    newDays.forEach((d, i) => {
      if (cfg.days[i]) d.periods = cfg.days[i].periods;
    });
    cfg.days = newDays;
    saveConfig(cfg);
  }

  // Returns the template "day" object (with its periods) that applies to a real calendar date,
  // or null if there is no school that day (weekend / marked exception / before cycle start).
  function getTemplateDayForDate(date) {
    const cfg = getConfig();
    if (!cfg) return null;
    const iso = toISODate(date);

    if (cfg.cycleOverrides && Object.prototype.hasOwnProperty.call(cfg.cycleOverrides, iso)) {
      return cfg.days[cfg.cycleOverrides[iso]] || null;
    }

    if (cfg.mode === "weekday") {
      const dow = date.getDay();
      if (dow === 0 || dow === 6) return null;
      if ((cfg.exceptions || []).includes(iso)) return null;
      return cfg.days[dow - 1] || null;
    }

    if (!cfg.cycleStartDate) return null;
    const start = parseISODate(cfg.cycleStartDate);
    if (date < start) return null;

    let counter = 0;
    let cursor = new Date(start);
    let safety = 0;
    while (safety < 3660) {
      const curIso = toISODate(cursor);
      const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      const isException = (cfg.exceptions || []).includes(curIso);
      const isSchoolDay = !isWeekend && !isException;
      if (curIso === iso) {
        return isSchoolDay ? cfg.days[counter % cfg.days.length] || null : null;
      }
      if (isSchoolDay) counter++;
      cursor.setDate(cursor.getDate() + 1);
      safety++;
    }
    return null;
  }

  // Like getTemplateDayForDate, but ignores exceptions/cycleOverrides — used to still show the
  // usual period/hour slots (for writing notes) on a day marked congé/pédagogique.
  function getUnderlyingTemplateDay(date) {
    const cfg = getConfig();
    if (!cfg) return null;
    if (cfg.mode === "weekday") {
      const dow = date.getDay();
      if (dow === 0 || dow === 6) return null;
      return cfg.days[dow - 1] || null;
    }
    return cfg.days[0] || null;
  }

  window.Config = {
    getConfig,
    saveConfig,
    ensureConfig,
    regenerateDays,
    getTemplateDayForDate,
    getUnderlyingTemplateDay,
    buildDefaultDays,
    getExceptionType,
    EXCEPTION_TYPES,
  };
})();
