(function () {
  function getEvents() {
    return Store.get("outlookEvents", []);
  }
  function saveEvents(list) {
    Store.set("outlookEvents", list);
  }
  function getSyncConfig() {
    return Store.get("outlookSyncConfig", { icsUrl: "", lastSync: "" });
  }
  function saveSyncConfig(c) {
    Store.set("outlookSyncConfig", c);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalParts(y, mo, d, h, mi, s, isUTC) {
    const date = isUTC ? new Date(Date.UTC(y, mo - 1, d, h, mi, s)) : new Date(y, mo - 1, d, h, mi, s);
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
  }

  function unfoldICS(text) {
    return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  }

  function parseICSEvents(text) {
    const lines = unfoldICS(text).split("\n");
    const events = [];
    let cur = null;
    lines.forEach((line) => {
      if (line.startsWith("BEGIN:VEVENT")) {
        cur = {};
      } else if (line.startsWith("END:VEVENT")) {
        if (cur) events.push(cur);
        cur = null;
      } else if (cur) {
        const idx = line.indexOf(":");
        if (idx === -1) return;
        const rawKey = line.slice(0, idx);
        const value = line.slice(idx + 1).trim();
        const key = rawKey.split(";")[0].toUpperCase();
        if (key === "UID") cur.uid = value;
        if (key === "SUMMARY") cur.summary = value.replace(/\\,/g, ",").replace(/\\n/gi, " ");
        if (key === "LOCATION") cur.location = value.replace(/\\,/g, ",");
        if (key === "DTSTART") {
          const isDateOnly = rawKey.toUpperCase().includes("VALUE=DATE") && !rawKey.toUpperCase().includes("VALUE=DATE-TIME");
          const m = value.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})(Z)?)?/);
          if (m) {
            if (m[4] && !isDateOnly) {
              const parts = toLocalParts(+m[1], +m[2], +m[3], +m[5], +m[6], +m[7] || 0, !!m[8]);
              cur.date = parts.date;
              cur.time = parts.time;
            } else {
              cur.date = `${m[1]}-${m[2]}-${m[3]}`;
            }
          }
        }
      }
    });
    return events;
  }

  function mergeEvents(parsed) {
    const existing = getEvents();
    const byUid = new Map(existing.map((e) => [e.uid, e]));
    let added = 0;
    parsed.forEach((p) => {
      if (!p.date || !p.summary) return;
      const uid = p.uid || p.date + "::" + p.summary;
      const already = byUid.has(uid);
      byUid.set(uid, {
        id: already ? byUid.get(uid).id : Store.uuid(),
        uid,
        date: p.date,
        time: p.time || "",
        title: p.summary,
        location: p.location || "",
      });
      if (!already) added++;
    });
    saveEvents(Array.from(byUid.values()));
    return { total: byUid.size, added };
  }

  async function syncFromUrl(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const result = mergeEvents(parseICSEvents(text));
    const cfg = getSyncConfig();
    cfg.icsUrl = url;
    cfg.lastSync = new Date().toISOString();
    saveSyncConfig(cfg);
    return result;
  }

  async function importFromFile(file) {
    const text = await file.text();
    return mergeEvents(parseICSEvents(text));
  }

  function forDate(iso) {
    return getEvents()
      .filter((e) => e.date === iso)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }

  function addDaysIso(iso, days) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function upcoming(fromIso, days) {
    const toIso = addDaysIso(fromIso, days);
    return getEvents()
      .filter((e) => e.date >= fromIso && e.date <= toIso)
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  }

  window.OutlookSync = { getEvents, getSyncConfig, syncFromUrl, importFromFile, forDate, upcoming };
})();
