(function () {
  const DEFAULTS = {
    meteo: true,
    evaluations: true,
    equipes: true,
    pigeage: true,
    ressources: true,
    ocr: true,
  };

  function get() {
    return Object.assign({}, DEFAULTS, Store.get("modules", {}));
  }
  function save(obj) {
    Store.set("modules", obj);
  }
  function isEnabled(name) {
    return get()[name] !== false;
  }

  window.Modules = { get, save, isEnabled, DEFAULTS };
})();
