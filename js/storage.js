(function () {
  const PREFIX = "planifprof.";

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error("storage.get", key, e);
      return fallback;
    }
  }

  function set(key, value, opts) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    if (!(opts && opts.silent)) {
      window.dispatchEvent(new CustomEvent("store-set", { detail: { key, value } }));
    }
  }

  function allKeys() {
    return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  window.Store = { get, set, allKeys, uuid, PREFIX };
})();
