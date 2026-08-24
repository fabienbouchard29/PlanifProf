(function () {
  let answers = null;
  let stepIndex = 0;
  let importSummary = null;

  function defaultAnswers() {
    return {
      mode: "weekday",
      cycleLength: 9,
      cycleStartDate: "",
      periodsPerDay: 6,
      dayStart: "08:30",
      periodDuration: 50,
      breakMinutes: 0,
      modules: Object.assign({}, Modules.DEFAULTS),
      weatherCity: "",
    };
  }

  function computeStepIds() {
    const ids = ["mode"];
    if (answers.mode === "cycle") ids.push("cycle");
    ids.push("import", "periods", "modules");
    if (answers.modules.meteo) ids.push("weather");
    return ids;
  }

  function addMinutes(hhmm, minutes) {
    const [h, m] = hhmm.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const hh = Math.floor((total % (24 * 60)) / 60);
    const mm = total % 60;
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }

  function buildConfigFromAnswers() {
    const cfg = {
      mode: answers.mode,
      cycleLength: answers.cycleLength,
      cycleStartDate: answers.cycleStartDate,
      exceptions: [],
      cycleOverrides: {},
      days: Config.buildDefaultDays(answers.mode, answers.cycleLength),
    };
    cfg.days.forEach((day) => {
      let cursor = answers.dayStart;
      day.periods = [];
      for (let i = 0; i < answers.periodsPerDay; i++) {
        const start = cursor;
        const end = addMinutes(cursor, answers.periodDuration);
        day.periods.push({ id: Store.uuid(), label: "Période " + (i + 1), start, end, type: "period" });
        cursor = end;
        if (answers.breakMinutes > 0 && i < answers.periodsPerDay - 1) {
          const breakStart = cursor;
          const breakEnd = addMinutes(cursor, answers.breakMinutes);
          day.periods.push({ id: Store.uuid(), label: "Pause", start: breakStart, end: breakEnd, type: "break" });
          cursor = breakEnd;
        }
      }
    });
    return cfg;
  }

  async function finish() {
    Config.saveConfig(buildConfigFromAnswers());
    if (importSummary) {
      // Re-apply on top of the freshly built schedule (merges exceptions / cycle days in).
      CalendarImport.applyImport(importSummary);
    }
    Modules.save(answers.modules);
    if (answers.modules.meteo && answers.weatherCity.trim()) {
      try {
        const results = await Weather.geocode(answers.weatherCity.trim());
        if (results.length) {
          const r = results[0];
          Weather.saveCity({ name: r.name, lat: r.latitude, lon: r.longitude });
        }
      } catch (e) {
        console.error("PlanifProf: géocodage impossible", e);
      }
    }
    close();
    if (window.applyModuleVisibility) window.applyModuleVisibility();
    if (window.rerenderCurrentView) window.rerenderCurrentView();
    if (window.Tour) window.Tour.maybeAutoStart();
  }

  function stepTemplateMode() {
    return `
      <h2>Comment fonctionne votre horaire ?</h2>
      <p class="muted">Pas certain ? Choisissez « Par semaine » — vous pourrez changer plus tard.</p>
      <div class="onboarding-options">
        <button type="button" class="onboarding-option ${answers.mode === "weekday" ? "selected" : ""}" data-mode="weekday">
          <strong>📅 Par semaine</strong>
          <span>Lundi à vendredi, comme un horaire normal.</span>
        </button>
        <button type="button" class="onboarding-option ${answers.mode === "cycle" ? "selected" : ""}" data-mode="cycle">
          <strong>🔁 Par cycle</strong>
          <span>Un cycle de plusieurs jours (ex. « Jour 1 » à « Jour 9 »).</span>
        </button>
      </div>
    `;
  }

  function stepTemplateCycle() {
    return `
      <h2>Votre cycle</h2>
      <label>Combien de jours dans un cycle complet ?
        <input type="number" id="ob-cycle-length" min="2" max="30" value="${answers.cycleLength}" />
      </label>
      <label>Quand commence le « Jour 1 » ? (facultatif)
        <input type="date" id="ob-cycle-start" value="${answers.cycleStartDate}" />
      </label>
      <p class="muted">Si vous ne savez pas encore, laissez vide — vous pourrez le préciser plus tard.</p>
    `;
  }

  function stepTemplateImport() {
    return `
      <h2>Avez-vous le calendrier de votre école ?</h2>
      <p class="muted">Si votre école vous a donné un fichier <strong>.ics</strong> avec les congés et journées pédagogiques, ajoutez-le ici. Sinon, cliquez simplement sur « Suivant ».</p>
      <label class="onboarding-upload">
        📎 Choisir mon fichier .ics
        <input type="file" id="ob-ics-input" accept=".ics,text/calendar" hidden />
      </label>
      <p id="ob-import-status" class="muted">${importSummary ? `✓ ${importSummary.exceptions.length} congé(s)/journée(s) pédagogique(s) trouvé(s)${importSummary.cycleDetected ? `, cycle de ${importSummary.cycleLength} jours détecté` : ""}.` : "Aucun fichier ajouté — c'est correct !"}</p>
    `;
  }

  function stepTemplatePeriods() {
    return `
      <h2>Vos cours dans une journée</h2>
      <p class="muted">On va préremplir votre horaire. Vous pourrez ajuster chaque période après.</p>
      <label>Combien de cours avez-vous par jour, en général ?
        <input type="number" id="ob-periods-per-day" min="1" max="12" value="${answers.periodsPerDay}" />
      </label>
      <label>À quelle heure commence la première période ?
        <input type="time" id="ob-day-start" value="${answers.dayStart}" />
      </label>
      <label>Combien de minutes dure un cours ?
        <input type="number" id="ob-period-duration" min="10" max="180" step="5" value="${answers.periodDuration}" />
      </label>
      <label>Combien de minutes de pause entre les cours ? (0 si aucune)
        <input type="number" id="ob-break-minutes" min="0" max="60" step="5" value="${answers.breakMinutes}" />
      </label>
    `;
  }

  function stepTemplateModules() {
    return `
      <h2>Quels outils voulez-vous voir ?</h2>
      <p class="muted">Cochez ce qui vous intéresse. Vous pourrez changer d'avis n'importe quand dans l'onglet Compte.</p>
      <div class="onboarding-modules">
        ${Modules.OPTIONS.map(
          (m) => `
          <label class="onboarding-module-row">
            <input type="checkbox" data-module="${m.key}" ${answers.modules[m.key] ? "checked" : ""} />
            <span><strong>${m.label}</strong><br /><span class="muted">${m.desc}</span></span>
          </label>
        `
        ).join("")}
      </div>
    `;
  }

  function stepTemplateWeather() {
    return `
      <h2>Votre ville, pour la météo</h2>
      <p class="muted">Facultatif — vous pourrez aussi l'ajouter plus tard depuis le Calendrier.</p>
      <label>Ville
        <input type="text" id="ob-weather-city" placeholder="Ex. Montréal" value="${answers.weatherCity}" />
      </label>
    `;
  }

  const STEP_RENDERERS = {
    mode: stepTemplateMode,
    cycle: stepTemplateCycle,
    import: stepTemplateImport,
    periods: stepTemplatePeriods,
    modules: stepTemplateModules,
    weather: stepTemplateWeather,
  };

  function readStepInputs(stepId, body) {
    if (stepId === "cycle") {
      answers.cycleLength = parseInt(body.querySelector("#ob-cycle-length").value, 10) || 9;
      answers.cycleStartDate = body.querySelector("#ob-cycle-start").value;
    }
    if (stepId === "periods") {
      answers.periodsPerDay = parseInt(body.querySelector("#ob-periods-per-day").value, 10) || 6;
      answers.dayStart = body.querySelector("#ob-day-start").value || "08:30";
      answers.periodDuration = parseInt(body.querySelector("#ob-period-duration").value, 10) || 50;
      answers.breakMinutes = parseInt(body.querySelector("#ob-break-minutes").value, 10) || 0;
    }
    if (stepId === "modules") {
      body.querySelectorAll("[data-module]").forEach((el) => {
        answers.modules[el.dataset.module] = el.checked;
      });
    }
    if (stepId === "weather") {
      answers.weatherCity = body.querySelector("#ob-weather-city").value;
    }
  }

  function render() {
    const card = document.getElementById("onboarding-card");
    const ids = computeStepIds();
    if (stepIndex >= ids.length) stepIndex = ids.length - 1;
    const stepId = ids[stepIndex];

    card.innerHTML = `
      <div class="onboarding-progress">${ids.map((_, i) => `<span class="onboarding-dot ${i === stepIndex ? "active" : ""} ${i < stepIndex ? "done" : ""}"></span>`).join("")}</div>
      <div class="onboarding-body">${STEP_RENDERERS[stepId]()}</div>
      <div class="onboarding-actions">
        <button type="button" class="btn btn-ghost" id="ob-back" ${stepIndex === 0 ? "disabled" : ""}>Précédent</button>
        <button type="button" class="btn btn-ghost" id="ob-skip">Passer tout ça</button>
        <button type="button" class="btn btn-primary" id="ob-next">${stepIndex === ids.length - 1 ? "C'est prêt !" : "Suivant"}</button>
      </div>
    `;

    const body = card.querySelector(".onboarding-body");
    body.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        answers.mode = btn.dataset.mode;
        render();
      });
    });

    const icsInput = body.querySelector("#ob-ics-input");
    if (icsInput) {
      icsInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const events = CalendarImport.parseICS(text);
        importSummary = CalendarImport.classify(events);
        body.querySelector("#ob-import-status").textContent =
          `✓ ${importSummary.exceptions.length} congé(s)/journée(s) pédagogique(s) trouvé(s)` +
          (importSummary.cycleDetected ? `, cycle de ${importSummary.cycleLength} jours détecté.` : ".");
      });
    }

    card.querySelector("#ob-back").addEventListener("click", () => {
      readStepInputs(stepId, body);
      stepIndex = Math.max(0, stepIndex - 1);
      render();
    });
    card.querySelector("#ob-skip").addEventListener("click", () => {
      close();
      Config.ensureConfig();
      if (window.applyModuleVisibility) window.applyModuleVisibility();
      if (window.rerenderCurrentView) window.rerenderCurrentView();
      if (window.Tour) window.Tour.maybeAutoStart();
    });
    card.querySelector("#ob-next").addEventListener("click", () => {
      readStepInputs(stepId, body);
      const nextIds = computeStepIds();
      if (stepIndex >= nextIds.length - 1) {
        finish();
      } else {
        stepIndex++;
        render();
      }
    });
  }

  function open() {
    answers = defaultAnswers();
    stepIndex = 0;
    importSummary = null;
    document.getElementById("onboarding-overlay").classList.add("open");
    render();
  }

  function close() {
    document.getElementById("onboarding-overlay").classList.remove("open");
  }

  function shouldShowOnboarding() {
    return !Config.getConfig();
  }

  window.Onboarding = { open, close, shouldShowOnboarding };
})();
