(function () {
  const MAX_NAME_LEN = 60;

  function looksLikeName(s) {
    const t = String(s || "").trim();
    if (!t || t.length > MAX_NAME_LEN) return false;
    if (/^\d+([.,]\d+)?$/.test(t)) return false;
    if (!/[a-zA-ZÀ-ÿ]/.test(t)) return false;
    return true;
  }

  function dedupeTrim(list) {
    const seen = new Set();
    const out = [];
    list.forEach((raw) => {
      const t = String(raw).replace(/\s+/g, " ").trim();
      if (!t || seen.has(t.toLowerCase())) return;
      seen.add(t.toLowerCase());
      out.push(t);
    });
    return out;
  }

  async function extractFromExcel(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const names = [];
    wb.SheetNames.forEach((sheetName) => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
      rows.forEach((row) => row.forEach((cell) => names.push(cell)));
    });
    return dedupeTrim(names.filter(looksLikeName));
  }

  async function extractFromWord(file) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    const lines = result.value.split(/\r?\n/);
    return dedupeTrim(lines.filter(looksLikeName));
  }

  async function extractFromPDF(file, onStatus) {
    const text = await PdfImport.extractSmart(file, onStatus);
    const lines = text.split(/\r?\n/);
    return dedupeTrim(lines.filter(looksLikeName));
  }

  async function extractFromCSV(file) {
    const text = await file.text();
    const parts = text.split(/\r?\n/).flatMap((l) => l.split(","));
    return dedupeTrim(parts.filter(looksLikeName));
  }

  function renderCandidates(box, candidates) {
    box.innerHTML = candidates
      .map(
        (c, i) => `
      <label class="pdf-candidate-row">
        <input type="checkbox" data-i="${i}" ${c.selected ? "checked" : ""} />
        <input type="text" data-name-i="${i}" value="${c.name}" class="student-import-name-input" />
      </label>
    `
      )
      .join("");
    box.querySelectorAll("[data-i]").forEach((el) => {
      el.addEventListener("change", (e) => {
        candidates[Number(el.dataset.i)].selected = e.target.checked;
      });
    });
    box.querySelectorAll("[data-name-i]").forEach((el) => {
      el.addEventListener("input", (e) => {
        candidates[Number(el.dataset.nameI)].name = e.target.value;
      });
    });
  }

  function populateGroupPicker(select) {
    const groups = Students.getGroups();
    select.innerHTML = groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join("") + `<option value="__new__">+ Nouveau groupe…</option>`;
  }

  function openImportModal() {
    const modal = document.getElementById("student-import-modal");
    modal.classList.add("open");
    const fileInput = modal.querySelector("#student-import-file-input");
    const status = modal.querySelector("#student-import-status");
    const resultsBox = modal.querySelector("#student-import-results");
    const groupPicker = modal.querySelector("#student-import-group-picker");
    const groupSelect = modal.querySelector("#student-import-group-select");
    const newGroupInput = modal.querySelector("#student-import-new-group");

    fileInput.value = "";
    status.textContent = "";
    resultsBox.innerHTML = "";
    groupPicker.style.display = "none";
    newGroupInput.style.display = "none";
    newGroupInput.value = "";
    populateGroupPicker(groupSelect);

    groupSelect.onchange = () => {
      newGroupInput.style.display = groupSelect.value === "__new__" ? "block" : "none";
    };

    let candidates = [];

    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      resultsBox.innerHTML = "";
      groupPicker.style.display = "none";
      status.textContent = "Lecture du fichier…";
      const ext = file.name.split(".").pop().toLowerCase();
      try {
        let names = [];
        if (ext === "xlsx" || ext === "xls") {
          if (typeof XLSX === "undefined") throw new Error("le lecteur Excel n'a pas pu se charger (connexion internet requise).");
          names = await extractFromExcel(file);
        } else if (ext === "csv") {
          names = await extractFromCSV(file);
        } else if (ext === "doc" || ext === "docx") {
          if (typeof mammoth === "undefined") throw new Error("le lecteur Word n'a pas pu se charger (connexion internet requise).");
          names = await extractFromWord(file);
        } else if (ext === "pdf") {
          if (typeof pdfjsLib === "undefined") throw new Error("le lecteur PDF n'a pas pu se charger (connexion internet requise).");
          names = await extractFromPDF(file, (msg) => {
            status.textContent = msg;
          });
        } else {
          throw new Error("format de fichier non reconnu.");
        }

        if (!names.length) {
          status.textContent = "Aucun nom reconnu automatiquement dans ce fichier — vérifiez qu'il contient bien du texte.";
          return;
        }

        candidates = names.map((name) => ({ name, selected: true }));
        status.textContent = `${candidates.length} nom(s) trouvé(s) — décochez ou corrigez ce qui n'est pas un nom, choisissez le groupe, puis importez.`;
        renderCandidates(resultsBox, candidates);
        groupPicker.style.display = "block";

        const applyBtn = document.createElement("button");
        applyBtn.type = "button";
        applyBtn.className = "btn btn-primary student-import-apply-btn";
        applyBtn.textContent = "Importer la sélection";
        applyBtn.addEventListener("click", () => {
          let groupId = groupSelect.value;
          if (groupId === "__new__") {
            const newName = newGroupInput.value.trim();
            if (!newName) {
              alert("Donnez un nom au nouveau groupe.");
              return;
            }
            groupId = Students.addGroup(newName).id;
          }
          const selected = candidates.filter((c) => c.selected && c.name.trim());
          selected.forEach((c) => Students.addStudent(groupId, c.name.trim(), "autre", 3));
          resultsBox.innerHTML = `<p class="muted">✓ ${selected.length} élève(s) importé(s). Vous pouvez fermer cette fenêtre.</p>`;
          groupPicker.style.display = "none";
          if (window.rerenderCurrentView) window.rerenderCurrentView();
        });
        resultsBox.appendChild(applyBtn);
      } catch (e) {
        status.textContent = "Erreur : " + e.message;
      }
    };

    modal.querySelector(".modal-close").onclick = () => modal.classList.remove("open");
  }

  window.StudentsImport = { openImportModal };
})();
