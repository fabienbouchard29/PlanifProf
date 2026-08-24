(function () {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const MONTHS_FR = {
    janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
  };
  const HOLIDAY_RE = /p[ée]dagog|cong[ée]|vacance|f[ée]ri[ée]|fermeture|rel[âa]che/i;
  const CYCLE_RE = /jour\s*0*([0-9]{1,2})\b/i;
  const DATE_RE_NAMED = /(\d{1,2})\s*(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+(\d{4})/i;
  const DATE_RE_ISO = /(\d{4})-(\d{2})-(\d{2})/;
  const DATE_RE_SLASH = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;

  function normalizeAccents(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function groupItemsIntoLines(items) {
    const rows = [];
    items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) {
        row = { y, parts: [] };
        rows.push(row);
      }
      row.parts.push({ x: item.transform[4], text: item.str });
    });
    rows.sort((a, b) => b.y - a.y);
    return rows
      .map((r) =>
        r.parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.text)
          .join(" ")
          .trim()
      )
      .filter(Boolean);
  }

  async function extractTextFromPDF(file) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      fullText += groupItemsIntoLines(content.items).join("\n") + "\n";
    }
    return fullText.trim();
  }

  async function extractTextViaOCR(file, onStatus) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      onStatus(`Reconnaissance de l'image — page ${pageNum}/${pdf.numPages}…`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const { data } = await Tesseract.recognize(canvas, "fra");
      fullText += data.text + "\n";
    }
    return fullText.trim();
  }

  async function extractSmart(file, onStatus) {
    onStatus("Lecture du PDF…");
    const text = await extractTextFromPDF(file);
    if (text.replace(/\s/g, "").length > 30) return text;
    onStatus("Aucun texte intégré trouvé — reconnaissance d'image en cours (peut prendre une minute)…");
    return extractTextViaOCR(file, onStatus);
  }

  function extractCandidates(text) {
    const lines = text.split("\n");
    const candidates = [];
    lines.forEach((line) => {
      let iso = null;
      let m = line.match(DATE_RE_NAMED);
      if (m) {
        const monthKey = normalizeAccents(m[2].toLowerCase());
        const month = MONTHS_FR[monthKey];
        if (month) iso = `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      }
      if (!iso) {
        m = line.match(DATE_RE_ISO);
        if (m) iso = `${m[1]}-${m[2]}-${m[3]}`;
      }
      if (!iso) {
        m = line.match(DATE_RE_SLASH);
        if (m) iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      }
      if (!iso) return;
      const cycleMatch = line.match(CYCLE_RE);
      candidates.push({
        date: iso,
        text: line.trim().slice(0, 140),
        isHoliday: HOLIDAY_RE.test(line),
        cycleDay: cycleMatch ? parseInt(cycleMatch[1], 10) : null,
      });
    });
    return candidates;
  }

  function buildResultFromSelection(candidates) {
    const selected = candidates.filter((c) => c.selected);
    const exceptions = selected.filter((c) => c.isHoliday).map((c) => c.date);
    const cycleMap = {};
    let maxDay = 0;
    selected
      .filter((c) => c.cycleDay)
      .forEach((c) => {
        cycleMap[c.date] = c.cycleDay - 1;
        if (c.cycleDay > maxDay) maxDay = c.cycleDay;
      });
    return {
      exceptions: Array.from(new Set(exceptions)).sort(),
      cycleMap,
      cycleDetected: Object.keys(cycleMap).length >= 5,
      cycleLength: maxDay,
    };
  }

  function renderCandidates(box, candidates) {
    box.innerHTML =
      candidates
        .map(
          (c, i) => `
      <label class="pdf-candidate-row">
        <input type="checkbox" data-i="${i}" ${c.selected ? "checked" : ""} />
        <span><strong>${c.date}</strong>${c.cycleDay ? ` (Jour ${c.cycleDay})` : ""}${c.isHoliday ? " · congé/pédagogique" : ""} — ${c.text}</span>
      </label>
    `
        )
        .join("") + `<button type="button" class="btn btn-primary" id="pdf-apply-btn">Ajouter la sélection à mon horaire</button>`;

    box.querySelectorAll("[data-i]").forEach((el) => {
      el.addEventListener("change", (e) => {
        candidates[Number(el.dataset.i)].selected = e.target.checked;
      });
    });
    box.querySelector("#pdf-apply-btn").addEventListener("click", () => {
      const result = buildResultFromSelection(candidates);
      CalendarImport.applyImport(result);
      box.innerHTML = `<p class="muted">✓ ${result.exceptions.length} jour(s) ajouté(s)${
        result.cycleDetected ? `, cycle de ${result.cycleLength} jours détecté` : ""
      }. Vous pouvez fermer cette fenêtre et vérifier votre Horaire.</p>`;
    });
  }

  function openImportModal() {
    const modal = document.getElementById("pdf-import-modal");
    modal.classList.add("open");
    const fileInput = modal.querySelector("#pdf-file-input");
    const status = modal.querySelector("#pdf-import-status");
    const resultsBox = modal.querySelector("#pdf-import-results");
    const rawTextBox = modal.querySelector("#pdf-raw-text");
    fileInput.value = "";
    status.textContent = "";
    resultsBox.innerHTML = "";
    rawTextBox.value = "";

    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      resultsBox.innerHTML = "";
      rawTextBox.value = "";
      if (typeof pdfjsLib === "undefined") {
        status.textContent = "Le lecteur de PDF n'a pas pu se charger (connexion internet requise).";
        return;
      }
      try {
        const text = await extractSmart(file, (msg) => {
          status.textContent = msg;
        });
        rawTextBox.value = text;
        const candidates = extractCandidates(text).map((c) => ({ ...c, selected: true }));
        if (!candidates.length) {
          status.textContent =
            "Aucune date reconnue automatiquement. Regardez le texte extrait ci-dessous et ajoutez les dates manuellement dans « Jours sans école » (section Paramètres de l'horaire).";
          return;
        }
        status.textContent = `${candidates.length} date(s) trouvée(s) — décochez ce qui n'est pas pertinent, puis cliquez sur le bouton pour appliquer.`;
        renderCandidates(resultsBox, candidates);
      } catch (e) {
        status.textContent = "Erreur lors de la lecture du PDF : " + e.message;
      }
    };

    modal.querySelector(".modal-close").onclick = () => modal.classList.remove("open");
  }

  window.PdfImport = { openImportModal, extractTextFromPDF, extractTextViaOCR, extractSmart };
})();
