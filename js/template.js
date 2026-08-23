(function () {
  function getAssignments() {
    return Store.get("templateAssignments", {});
  }
  function saveAssignments(a) {
    Store.set("templateAssignments", a);
  }
  function keyFor(dayId, periodId) {
    return dayId + "::" + periodId;
  }

  function addPeriod(cfg, day) {
    const count = day.periods.filter((p) => p.type !== "break").length;
    day.periods.push({ id: Store.uuid(), label: "Période " + (count + 1), start: "", end: "", type: "period" });
    Config.saveConfig(cfg);
  }
  function addBreak(cfg, day) {
    day.periods.push({ id: Store.uuid(), label: "Pause", start: "", end: "", type: "break" });
    Config.saveConfig(cfg);
  }
  function removePeriod(cfg, day, periodId) {
    day.periods = day.periods.filter((p) => p.id !== periodId);
    Config.saveConfig(cfg);
  }
  function sortPeriodsByTime(day) {
    day.periods.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    let n = 0;
    day.periods.forEach((p) => {
      if (p.type === "break") return;
      n++;
      if (/^Période \d+$/.test(p.label)) p.label = "Période " + n;
    });
  }

  function findOverlap(day, period) {
    if (!period.start || !period.end) return null;
    return (
      day.periods.find((p) => {
        if (p.id === period.id) return false;
        if (!p.start || !p.end) return false;
        return period.start < p.end && p.start < period.end;
      }) || null
    );
  }

  function confirmNoOverlap(day, period) {
    const conflict = findOverlap(day, period);
    if (!conflict) return true;
    return confirm(
      `Attention : « ${period.label} » (${period.start}-${period.end}) chevauche « ${conflict.label} » (${conflict.start}-${conflict.end}).\n\nGarder ces heures quand même ?`
    );
  }

  function copyPeriodsToAll(cfg, sourceDay) {
    cfg.days.forEach((d) => {
      if (d.id !== sourceDay.id) {
        d.periods = sourceDay.periods.map((p) => ({ ...p, id: Store.uuid() }));
      }
    });
    Config.saveConfig(cfg);
  }

  let openPopover = null;
  function closePopover() {
    if (openPopover) {
      openPopover.remove();
      openPopover = null;
    }
  }

  function openSubjectPicker(anchorEl, onPick) {
    closePopover();
    const subjects = Subjects.getSubjects();
    const pop = document.createElement("div");
    pop.className = "popover";
    pop.innerHTML = `<div class="popover-title">Matière par défaut</div>`;
    const none = document.createElement("button");
    none.type = "button";
    none.className = "chip chip-none";
    none.textContent = "Aucune";
    none.addEventListener("click", () => {
      onPick(null);
      closePopover();
    });
    pop.appendChild(none);
    subjects.forEach((s) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.style.background = s.color;
      chip.textContent = s.name;
      chip.addEventListener("click", () => {
        onPick(s.id);
        closePopover();
      });
      pop.appendChild(chip);
    });
    document.body.appendChild(pop);
    const rect = anchorEl.getBoundingClientRect();
    pop.style.top = window.scrollY + rect.bottom + 4 + "px";
    pop.style.left = window.scrollX + rect.left + "px";
    openPopover = pop;
    setTimeout(() => {
      document.addEventListener("click", function handler(e) {
        if (!pop.contains(e.target) && e.target !== anchorEl) {
          closePopover();
          document.removeEventListener("click", handler);
        }
      });
    }, 0);
  }

  function render(container) {
    container.innerHTML = "";
    const cfg = Config.ensureConfig();
    const assignments = getAssignments();

    const wizardBar = document.createElement("div");
    wizardBar.className = "settings-panel wizard-shortcut";
    wizardBar.innerHTML = `
      <div>
        <strong>Besoin d'aide pour tout configurer ?</strong>
        <p class="muted" style="margin:0.2rem 0 0;">L'assistant vous guide pas à pas : horaire, périodes, congés, outils à activer.</p>
      </div>
      <button type="button" class="btn btn-primary" id="wizard-shortcut-btn">🧭 Lancer l'assistant</button>
    `;
    wizardBar.querySelector("#wizard-shortcut-btn").addEventListener("click", () => Onboarding.open());
    container.appendChild(wizardBar);

    const settings = document.createElement("details");
    settings.className = "settings-panel";
    settings.innerHTML = `<summary>Paramètres de l'horaire</summary>`;
    const settingsBody = document.createElement("div");
    settingsBody.className = "settings-body";
    settingsBody.innerHTML = `
      <label>Type d'horaire
        <select id="cfg-mode">
          <option value="weekday" ${cfg.mode === "weekday" ? "selected" : ""}>Jours de semaine (lundi-vendredi)</option>
          <option value="cycle" ${cfg.mode === "cycle" ? "selected" : ""}>Cycle de plusieurs jours</option>
        </select>
      </label>
      <div id="cycle-fields" style="display:flex; gap:1rem; flex-wrap:wrap; ${cfg.mode === "cycle" ? "" : "display:none"}">
        <label>Nombre de jours dans le cycle
          <input type="number" id="cfg-cycle-length" min="2" max="30" value="${cfg.cycleLength}" />
        </label>
        <label>Date de départ du jour 1
          <input type="date" id="cfg-cycle-start" value="${cfg.cycleStartDate || ""}" />
        </label>
      </div>
    `;
    settings.appendChild(settingsBody);
    container.appendChild(settings);

    settingsBody.querySelector("#cfg-mode").addEventListener("change", (e) => {
      cfg.mode = e.target.value;
      Config.regenerateDays(cfg);
      render(container);
      document.dispatchEvent(new CustomEvent("config-changed"));
    });
    const cycleLengthEl = settingsBody.querySelector("#cfg-cycle-length");
    if (cycleLengthEl) {
      cycleLengthEl.addEventListener("change", (e) => {
        cfg.cycleLength = parseInt(e.target.value, 10) || 9;
        Config.regenerateDays(cfg);
        render(container);
        document.dispatchEvent(new CustomEvent("config-changed"));
      });
    }
    const cycleStartEl = settingsBody.querySelector("#cfg-cycle-start");
    if (cycleStartEl) {
      cycleStartEl.addEventListener("change", (e) => {
        cfg.cycleStartDate = e.target.value;
        Config.saveConfig(cfg);
        document.dispatchEvent(new CustomEvent("config-changed"));
      });
    }

    const subjectsSection = document.createElement("details");
    subjectsSection.className = "settings-panel";
    subjectsSection.innerHTML = `<summary>Matières et groupes (couleurs)</summary>`;
    const subjectsBody = document.createElement("div");
    subjectsBody.className = "settings-body";
    subjectsSection.appendChild(subjectsBody);
    container.appendChild(subjectsSection);
    Subjects.renderManager(subjectsBody);

    const grid = document.createElement("div");
    grid.className = "template-grid";
    cfg.days.forEach((day) => {
      const col = document.createElement("div");
      col.className = "template-day";
      const header = document.createElement("div");
      header.className = "template-day-header";
      header.innerHTML = `<span>${day.label}</span>`;
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn-ghost btn-small";
      copyBtn.textContent = "Copier les heures →";
      copyBtn.title = "Copier les heures des périodes et des pauses vers tous les autres jours (les matières ne sont pas copiées)";
      copyBtn.addEventListener("click", () => {
        copyPeriodsToAll(cfg, day);
        render(container);
      });
      header.appendChild(copyBtn);
      col.appendChild(header);

      day.periods.forEach((period) => {
        const isBreak = period.type === "break";
        const cell = document.createElement("div");
        const subjId = !isBreak ? assignments[keyFor(day.id, period.id)] : null;
        const subj = subjId ? Subjects.getSubject(subjId) : null;
        cell.className = "template-cell" + (isBreak ? " template-cell-break" : "");
        if (subj) {
          cell.style.background = subj.color + "22";
          cell.style.borderColor = subj.color;
        }
        cell.innerHTML = `
          <input type="text" class="period-label" value="${period.label}" />
          <div class="period-times">
            <input type="time" class="period-start" value="${period.start || ""}" />
            <input type="time" class="period-end" value="${period.end || ""}" />
          </div>
          ${isBreak ? "" : `<button type="button" class="subject-tag" style="${subj ? "background:" + subj.color + ";color:#fff" : ""}">${subj ? subj.name : "Matière…"}</button>`}
          <button type="button" class="cell-remove" title="Supprimer">✕</button>
        `;
        cell.querySelector(".period-label").addEventListener("change", (e) => {
          period.label = e.target.value;
          Config.saveConfig(cfg);
        });
        cell.querySelector(".period-start").addEventListener("change", (e) => {
          const oldValue = period.start;
          period.start = e.target.value;
          if (!confirmNoOverlap(day, period)) {
            period.start = oldValue;
            e.target.value = oldValue;
            return;
          }
          sortPeriodsByTime(day);
          Config.saveConfig(cfg);
          render(container);
        });
        cell.querySelector(".period-end").addEventListener("change", (e) => {
          const oldValue = period.end;
          period.end = e.target.value;
          if (!confirmNoOverlap(day, period)) {
            period.end = oldValue;
            e.target.value = oldValue;
            return;
          }
          Config.saveConfig(cfg);
        });
        const subjectTag = cell.querySelector(".subject-tag");
        if (subjectTag) {
          subjectTag.addEventListener("click", (e) => {
            openSubjectPicker(e.target, (subjectId) => {
              const a = getAssignments();
              if (subjectId) a[keyFor(day.id, period.id)] = subjectId;
              else delete a[keyFor(day.id, period.id)];
              saveAssignments(a);
              render(container);
              document.dispatchEvent(new CustomEvent("template-changed"));
            });
          });
        }
        cell.querySelector(".cell-remove").addEventListener("click", () => {
          removePeriod(cfg, day, period.id);
          render(container);
        });
        col.appendChild(cell);
      });

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-ghost btn-small add-period-btn";
      addBtn.textContent = "+ Période";
      addBtn.addEventListener("click", () => {
        addPeriod(cfg, day);
        render(container);
      });
      col.appendChild(addBtn);

      const addBreakBtn = document.createElement("button");
      addBreakBtn.type = "button";
      addBreakBtn.className = "btn btn-ghost btn-small add-period-btn";
      addBreakBtn.textContent = "+ Pause";
      addBreakBtn.addEventListener("click", () => {
        addBreak(cfg, day);
        render(container);
      });
      col.appendChild(addBreakBtn);

      grid.appendChild(col);
    });
    container.appendChild(grid);

    const pickerSection = document.createElement("details");
    pickerSection.className = "settings-panel";
    pickerSection.innerHTML = `<summary>Marquer les jours sans école visuellement (cliquer sur un calendrier)</summary>`;
    const pickerBody = document.createElement("div");
    pickerSection.appendChild(pickerBody);
    container.appendChild(pickerSection);
    pickerSection.addEventListener("toggle", () => {
      if (pickerSection.open) CalendarPicker.render(pickerBody);
    });

    const importSection = document.createElement("details");
    importSection.className = "settings-panel";
    importSection.innerHTML = `<summary>Importer le calendrier de mon école (congés, journées pédagogiques)</summary>`;
    const importBody = document.createElement("div");
    importBody.className = "settings-body";
    importBody.innerHTML = `
      <p class="muted" style="flex-basis:100%">Si votre centre de services scolaire fournit un fichier .ics, vous pouvez l'importer ici pour ajouter automatiquement les congés et journées pédagogiques (et détecter votre cycle, si le fichier l'indique).</p>
      <input type="file" id="ics-file-input" accept=".ics,text/calendar" />
      <div id="ics-import-result" style="flex-basis:100%"></div>
      <p class="muted" style="flex-basis:100%; margin-top:0.5rem;">Vous avez seulement un PDF (calendrier scolaire papier numérisé) ? On peut essayer de le lire aussi — moins fiable, à vérifier avant d'appliquer.</p>
      <button type="button" class="btn btn-ghost" id="pdf-import-open-btn" style="flex-basis:100%">📄 Importer un calendrier PDF</button>
    `;
    importSection.appendChild(importBody);
    container.appendChild(importSection);

    importBody.querySelector("#ics-file-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const events = CalendarImport.parseICS(text);
      const result = CalendarImport.classify(events);
      const resultBox = importBody.querySelector("#ics-import-result");
      resultBox.innerHTML = `
        <p>${result.exceptions.length} congé(s)/journée(s) pédagogique(s) trouvé(s) dans le fichier.</p>
        <p>${result.cycleDetected ? `Un cycle de ${result.cycleLength} jours a été détecté.` : "Aucun cycle détecté — seuls les congés seront ajoutés."}</p>
        <button type="button" class="btn btn-primary" id="ics-apply">Ajouter à mon horaire</button>
      `;
      resultBox.querySelector("#ics-apply").addEventListener("click", () => {
        CalendarImport.applyImport(result);
        render(container);
      });
    });

    importBody.querySelector("#pdf-import-open-btn").addEventListener("click", () => PdfImport.openImportModal());

    const modulesSection = document.createElement("details");
    modulesSection.className = "settings-panel";
    modulesSection.innerHTML = `<summary>Outils</summary>`;
    const modulesBody = document.createElement("div");
    modulesBody.className = "onboarding-modules";
    modulesBody.style.marginTop = "0.75rem";
    const currentModules = Modules.get();
    modulesBody.innerHTML = Modules.OPTIONS.map(
      (m) => `
      <label class="onboarding-module-row">
        <input type="checkbox" data-module="${m.key}" ${currentModules[m.key] ? "checked" : ""} />
        <span><strong>${m.label}</strong><br /><span class="muted">${m.desc}</span></span>
      </label>
    `
    ).join("");
    modulesBody.querySelectorAll("[data-module]").forEach((el) => {
      el.addEventListener("change", () => {
        const updated = Modules.get();
        updated[el.dataset.module] = el.checked;
        Modules.save(updated);
        if (window.applyModuleVisibility) window.applyModuleVisibility();
      });
    });
    modulesSection.appendChild(modulesBody);
    container.appendChild(modulesSection);
  }

  window.TemplateView = { render, getAssignments, keyFor };
})();
