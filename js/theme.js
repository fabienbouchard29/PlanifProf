(function () {
  function get() {
    return Store.get("theme", "colore");
  }
  function set(name) {
    Store.set("theme", name);
    document.documentElement.setAttribute("data-theme", name);
  }
  window.Theme = { get, set };
})();
