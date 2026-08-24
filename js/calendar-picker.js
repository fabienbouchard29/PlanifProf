(function () {
  const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const DOW_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

  let state = null;
  let openPopover = null;
  let quickMode = null; // null = "choisir à chaque clic", "retirer", or an EXCEPTION_TYPES key
  let countLabelEl = null;

  // Reference photo/PDF of the school calendar, kept visible next to the picker for this
  // session only (not saved) — just a memory aid while clicking through the months by hand.
  let referenceFile = null;
  let referenceImageUrl = null;
  let referencePdf = null;
  let referencePage = 1;

  function clearReference() {
    if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
    referenceFile = null;
    referenceImageUrl = null;
    referencePdf = null;
    referencePage = 1;
  }

  async function loadReferenceFile(file, container) {
    clearReference();
    referenceFile = file;
    if (file.type === "application/pdf") {
      if (typeof pdfjsLib === "undefined") {
        alert("Le lecteur de PDF n'a pas pu se charger (connexion internet requise).");
        referenceFile = null;
        return;
      }
      const buf = await file.arrayBuffer();
      referencePdf = await pdfjsLib.getDocument({ data: buf }).promise;
      referencePage = 1;
    } else {
      referenceImageUrl = URL.createObjectURL(file);
    }
    render(container);
  }

  async function renderReferencePdfPage(canvas) {
    const page = await referencePdf.getPage(referencePage);
    const viewport = page.getViewport({ scale: 1.3 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  }

  function renderReferencePanel(container) {
    const box = document.createElement("div");
    box.className = "picker-reference";

    if (!referenceFile) {
      box.innerHTML = `
        <p class="muted" style="margin-top:0;">Gardez une photo ou le PDF de votre calendrier scolaire affiché ici pendant que vous cliquez sur les jours à droite.</p>
        <label class="onboarding-upload" style="display:inline-flex;">
          📎 Choisir une photo ou un PDF
          <input type="file" id="cp-reference-input" accept="image/*,application/pdf" hidden />
        </label>
      `;
      box.querySelector("#cp-reference-input").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) loadReferenceFile(file, container);
      });
      return box;
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-ghost btn-small picker-reference-remove";
    removeBtn.textContent = "✕ Retirer";
    removeBtn.addEventListener("click", () => {
      clearReference();
      render(container);
    });
    box.appendChild(removeBtn);

    if (referenceImageUrl) {
      const img = document.createElement("img");
      img.src = referenceImageUrl;
      img.className = "picker-reference-media";
      img.alt = "Calendrier scolaire importé";
      box.appendChild(img);
    } else if (referencePdf) {
      const canvas = document.createElement("canvas");
      canvas.className = "picker-reference-media";
      box.appendChild(canvas);
      renderReferencePdfPage(canvas);

      if (referencePdf.numPages > 1) {
        const nav = document.createElement("div");
        nav.className = "picker-reference-nav";
        nav.innerHTML = `
          <button type="button" class="btn btn-ghost btn-small" id="cp-ref-prev" ${referencePage <= 1 ? "disabled" : ""}>◀</button>
          <span class="muted">Page ${referencePage} / ${referencePdf.numPages}</span>
          <button type="button" class="btn btn-ghost btn-small" id="cp-ref-next" ${referencePage >= referencePdf.numPages ? "disabled" : ""}>▶</button>
        `;
        nav.querySelector("#cp-ref-prev").addEventListener("click", () => {
          referencePage = Math.max(1, referencePage - 1);
          render(container);
        });
        nav.querySelector("#cp-ref-next").addEventListener("click", () => {
          referencePage = Math.min(referencePdf.numPages, referencePage + 1);
          render(container);
        });
        box.appendChild(nav);
      }
    }
    return box;
  }

  function toISO(d) {
    return d.toISOString().slice(0, 10);
  }

  function ensureState() {
    if (state) return state;
    const now = new Date();
    state = { startYear: now.getFullYear(), startMonth: now.getMonth() };
    return state;
  }

  function monthsFrom(startYear, startMonth, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const y = startYear + Math.floor((startMonth + i) / 12);
      const m = (((startMonth + i) % 12) + 12) % 12;
      list.push({ year: y, month: m });
    }
    return list;
  }

  function buildMonthCells(year, month) {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function closePopover() {
    if (openPopover) {
      openPopover.remove();
      openPopover = null;
    }
  }

  function updateDayButton(cfg, iso, btn) {
    const isMarked = cfg.exceptions.includes(iso);
    const typeInfo = Config.EXCEPTION_TYPES.find((t) => t.key === cfg.exceptionTypes[iso]);
    btn.className = "mini-day" + (isMarked ? " marked" : "");
    btn.style.background = isMarked ? (typeInfo ? typeInfo.color : "") : "";
    btn.title = isMarked ? `${typeInfo ? typeInfo.label : "Sans école"} — cliquer pour modifier` : "Cliquer pour marquer ce jour";
  }

  function updateCount(cfg) {
    if (countLabelEl) countLabelEl.textContent = `${cfg.exceptions.length} jour(s) marqué(s) au total.`;
  }

  function applyQuickMode(cfg, iso, btn) {
    if (quickMode === "retirer") {
      const idx = cfg.exceptions.indexOf(iso);
      if (idx !== -1) cfg.exceptions.splice(idx, 1);
      delete cfg.exceptionTypes[iso];
    } else {
      cfg.exceptionTypes[iso] = quickMode;
      if (!cfg.exceptions.includes(iso)) {
        cfg.exceptions.push(iso);
        cfg.exceptions.sort();
      }
    }
    Config.saveConfig(cfg);
    document.dispatchEvent(new CustomEvent("config-changed"));
    updateDayButton(cfg, iso, btn);
    updateCount(cfg);
  }

  function openTypePicker(anchorEl, iso, cfg, onDone) {
    closePopover();
    const pop = document.createElement("div");
    pop.className = "popover";
    const currentType = cfg.exceptionTypes[iso];
    pop.innerHTML = `<div class="popover-title">${iso}</div>`;

    Config.EXCEPTION_TYPES.forEach((t) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (currentType === t.key ? " chip-active" : "");
      chip.style.background = t.color;
      chip.textContent = t.label;
      chip.addEventListener("click", () => {
        cfg.exceptionTypes[iso] = t.key;
        if (!cfg.exceptions.includes(iso)) {
          cfg.exceptions.push(iso);
          cfg.exceptions.sort();
        }
        Config.saveConfig(cfg);
        closePopover();
        onDone();
      });
      pop.appendChild(chip);
    });

    if (cfg.exceptions.includes(iso)) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "chip chip-none";
      removeBtn.textContent = "Retirer — jour d'école normal";
      removeBtn.addEventListener("click", () => {
        const idx = cfg.exceptions.indexOf(iso);
        if (idx !== -1) cfg.exceptions.splice(idx, 1);
        delete cfg.exceptionTypes[iso];
        Config.saveConfig(cfg);
        closePopover();
        onDone();
      });
      pop.appendChild(removeBtn);
    }

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

  function renderMonth(cfg, year, month, rootContainer) {
    const box = document.createElement("div");
    box.className = "mini-month";
    box.innerHTML = `<div class="mini-month-title">${MONTH_NAMES[month]} ${year}</div>`;

    const table = document.createElement("table");
    table.className = "mini-month-table";
    table.innerHTML = "<thead><tr>" + DOW_LABELS.map((d) => `<th>${d}</th>`).join("") + "</tr></thead>";

    const tbody = document.createElement("tbody");
    const cells = buildMonthCells(year, month);
    for (let i = 0; i < cells.length; i += 7) {
      const tr = document.createElement("tr");
      cells.slice(i, i + 7).forEach((date) => {
        const td = document.createElement("td");
        if (date) {
          const iso = toISO(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "mini-day" + (isWeekend ? " weekend" : "");
          btn.textContent = String(date.getDate());
          btn.disabled = isWeekend;
          if (isWeekend) {
            btn.title = "Fin de semaine (déjà sans école)";
          } else {
            updateDayButton(cfg, iso, btn);
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (quickMode) {
                applyQuickMode(cfg, iso, btn);
              } else {
                openTypePicker(btn, iso, cfg, () => {
                  document.dispatchEvent(new CustomEvent("config-changed"));
                  render(rootContainer);
                });
              }
            });
          }
          td.appendChild(btn);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    box.appendChild(table);
    return box;
  }

  function render(container) {
    const cfg = Config.ensureConfig();
    const s = ensureState();
    container.innerHTML = "";

    const layout = document.createElement("div");
    layout.className = "picker-layout";
    layout.appendChild(renderReferencePanel(container));
    const mainCol = document.createElement("div");
    layout.appendChild(mainCol);
    container.appendChild(layout);

    const controls = document.createElement("div");
    controls.className = "settings-body";
    controls.innerHTML = `
      <label>Afficher 12 mois à partir de
        <input type="month" id="cp-start-month" value="${s.startYear}-${String(s.startMonth + 1).padStart(2, "0")}" />
      </label>
      <button type="button" class="btn btn-ghost" id="cp-clear">Tout effacer</button>
      <button type="button" class="btn btn-ghost" id="cp-qc-holidays">🍁 Ajouter les congés fériés du Québec</button>
      <span class="muted" id="cp-count"></span>
    `;
    mainCol.appendChild(controls);
    countLabelEl = controls.querySelector("#cp-count");

    controls.querySelector("#cp-qc-holidays").addEventListener("click", () => {
      const years = new Set([s.startYear, s.startYear + 1]);
      const candidates = Array.from(years)
        .sort()
        .flatMap((y) => QcHolidays.computeQuebecHolidays(y))
        .filter((h) => !cfg.exceptions.includes(h.date));
      if (!candidates.length) {
        alert("Tous les congés fériés du Québec pour cette période sont déjà marqués.");
        return;
      }
      const list = candidates.map((h) => `• ${h.date} — ${h.label}`).join("\n");
      const ok = confirm(`Ajouter ces ${candidates.length} congé(s) férié(s) du Québec (type « Congé ») ?\n\n${list}`);
      if (!ok) return;
      candidates.forEach((h) => {
        cfg.exceptions.push(h.date);
        cfg.exceptionTypes[h.date] = "conge";
      });
      cfg.exceptions.sort();
      Config.saveConfig(cfg);
      document.dispatchEvent(new CustomEvent("config-changed"));
      render(container);
    });

    controls.querySelector("#cp-start-month").addEventListener("change", (e) => {
      if (!e.target.value) return;
      const [y, m] = e.target.value.split("-").map(Number);
      s.startYear = y;
      s.startMonth = m - 1;
      render(container);
    });
    controls.querySelector("#cp-clear").addEventListener("click", () => {
      if (confirm("Effacer tous les jours marqués comme sans école ?")) {
        cfg.exceptions = [];
        cfg.exceptionTypes = {};
        Config.saveConfig(cfg);
        document.dispatchEvent(new CustomEvent("config-changed"));
        render(container);
      }
    });
    updateCount(cfg);

    const modeBar = document.createElement("div");
    modeBar.className = "quick-mode-bar";
    modeBar.innerHTML = `<span class="muted">Mode de clic — choisissez un type, puis cliquez sur plusieurs jours d'affilée :</span>`;

    const noneChip = document.createElement("button");
    noneChip.type = "button";
    noneChip.className = "chip chip-none" + (quickMode === null ? " chip-active" : "");
    noneChip.textContent = "✋ Choisir à chaque clic";
    noneChip.addEventListener("click", () => {
      quickMode = null;
      render(container);
    });
    modeBar.appendChild(noneChip);

    Config.EXCEPTION_TYPES.forEach((t) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (quickMode === t.key ? " chip-active" : "");
      chip.style.background = t.color;
      chip.textContent = "🖊️ " + t.label;
      chip.addEventListener("click", () => {
        quickMode = t.key;
        render(container);
      });
      modeBar.appendChild(chip);
    });

    const removeChip = document.createElement("button");
    removeChip.type = "button";
    removeChip.className = "chip chip-none" + (quickMode === "retirer" ? " chip-active" : "");
    removeChip.textContent = "🧹 Retirer";
    removeChip.addEventListener("click", () => {
      quickMode = "retirer";
      render(container);
    });
    modeBar.appendChild(removeChip);
    mainCol.appendChild(modeBar);

    const legend = document.createElement("div");
    legend.className = "mini-legend";
    legend.innerHTML = Config.EXCEPTION_TYPES.map(
      (t) => `<span class="mini-legend-item"><span class="mini-legend-dot" style="background:${t.color}"></span>${t.label}</span>`
    ).join("");
    mainCol.appendChild(legend);

    const grid = document.createElement("div");
    grid.className = "mini-month-grid-wrap";
    monthsFrom(s.startYear, s.startMonth, 12).forEach(({ year, month }) => {
      grid.appendChild(renderMonth(cfg, year, month, container));
    });
    mainCol.appendChild(grid);
  }

  window.CalendarPicker = { render };
})();
