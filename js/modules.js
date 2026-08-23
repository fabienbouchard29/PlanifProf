(function () {
  const DEFAULTS = {
    meteo: true,
    evaluations: true,
    equipes: true,
    pigeage: true,
    presences: true,
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

  const OPTIONS = [
    { key: "meteo", label: "🌦️ Météo", desc: "Un petit résumé météo dans l'Agenda." },
    { key: "presences", label: "✅ Présences", desc: "Prendre les présences par groupe, jour par jour." },
    { key: "evaluations", label: "📝 Évaluations", desc: "Noter vos élèves pour chaque évaluation." },
    { key: "equipes", label: "🤝 Équipes équilibrées", desc: "Former des équipes automatiquement." },
    { key: "pigeage", label: "🎲 Pige au hasard", desc: "Choisir un élève au hasard en classe." },
    { key: "ressources", label: "📚 Banque de ressources", desc: "Garder vos ressources d'une année à l'autre." },
    { key: "ocr", label: "📷 Importer une photo", desc: "Reconnaître le texte d'un horaire papier pris en photo." },
  ];

  window.Modules = { get, save, isEnabled, DEFAULTS, OPTIONS };
})();
