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
    day.periods.push({ id: Store.uuid(), label: "Période " + (day.periods.length + 1), start: "", end: "" });
    Config.saveConfig(cfg);
  }
  function removePeriod(cfg, day, periodId) {
    day.periods = day.periods.filter((p) => p.id !== periodId);
    Config.saveConfig(cfg);
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
      <label style="flex:1; min-width:220px;">Jours sans école (congés, séparés par des virgules, AAAA-MM-JJ)
        <input type="text" id="cfg-exceptions" value="${(cfg.exceptions || []).join(", ")}" placeholder="2026-10-12, 2026-12-22" />
      </label>
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
    settingsBody.querySelector("#cfg-exceptions").addEventListener("change", (e) => {
      cfg.exceptions = e.target.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      Config.saveConfig(cfg);
      document.dispatchEvent(new CustomEvent("config-changed"));
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
      copyBtn.textContent = "Copier →";
      copyBtn.title = "Copier ces périodes vers tous les autres jours";
      copyBtn.addEventListener("click", () => {
        copyPeriodsToAll(cfg, day);
        render(container);
      });
      header.appendChild(copyBtn);
      col.appendChild(header);

      day.periods.forEach((period) => {
        const cell = document.createElement("div");
        const subjId = assignments[keyFor(day.id, period.id)];
        const subj = subjId ? Subjects.getSubject(subjId) : null;
        cell.className = "template-cell";
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
          <button type="button" class="subject-tag" style="${subj ? "background:" + subj.color + ";color:#fff" : ""}">${subj ? subj.name : "Matière…"}</button>
          <button type="button" class="cell-remove" title="Supprimer cette période">✕</button>
        `;
        cell.querySelector(".period-label").addEventListener("change", (e) => {
          period.label = e.target.value;
          Config.saveConfig(cfg);
        });
        cell.querySelector(".period-start").addEventListener("change", (e) => {
          period.start = e.target.value;
          Config.saveConfig(cfg);
        });
        cell.querySelector(".period-end").addEventListener("change", (e) => {
          period.end = e.target.value;
          Config.saveConfig(cfg);
        });
        cell.querySelector(".subject-tag").addEventListener("click", (e) => {
          openSubjectPicker(e.target, (subjectId) => {
            const a = getAssignments();
            if (subjectId) a[keyFor(day.id, period.id)] = subjectId;
            else delete a[keyFor(day.id, period.id)];
            saveAssignments(a);
            render(container);
            document.dispatchEvent(new CustomEvent("template-changed"));
          });
        });
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

      grid.appendChild(col);
    });
    container.appendChild(grid);
  }

  window.TemplateView = { render, getAssignments, keyFor };
})();
