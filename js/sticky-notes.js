(function () {
  function getNotes() {
    return Store.get("stickyNotes", []);
  }
  function saveNotes(list) {
    Store.set("stickyNotes", list);
  }
  function updateNote(id, patch) {
    saveNotes(getNotes().map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }
  function removeNote(id) {
    saveNotes(getNotes().filter((n) => n.id !== id));
    renderAll();
  }

  function addNote() {
    const list = getNotes();
    list.push({
      id: Store.uuid(),
      text: "",
      x: 60 + Math.round(Math.random() * 60),
      y: 90 + Math.round(Math.random() * 60),
      color: "yellow",
    });
    saveNotes(list);
    renderAll();
  }

  function clampToViewport(x, y) {
    const maxX = Math.max(0, window.innerWidth - 170);
    const maxY = Math.max(0, window.innerHeight - 170);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  }

  function makeDraggable(el, handle, note) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function start(clientX, clientY) {
      dragging = true;
      offsetX = clientX - el.offsetLeft;
      offsetY = clientY - el.offsetTop;
      el.classList.add("dragging");
    }
    function move(clientX, clientY) {
      if (!dragging) return;
      const pos = clampToViewport(clientX - offsetX, clientY - offsetY);
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("dragging");
      updateNote(note.id, { x: parseInt(el.style.left, 10) || 0, y: parseInt(el.style.top, 10) || 0 });
    }

    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      e.preventDefault();
      start(e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    document.addEventListener("mouseup", end);

    handle.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.closest("button")) return;
        const t = e.touches[0];
        start(t.clientX, t.clientY);
      },
      { passive: true }
    );
    document.addEventListener(
      "touchmove",
      (e) => {
        if (!dragging) return;
        const t = e.touches[0];
        move(t.clientX, t.clientY);
      },
      { passive: true }
    );
    document.addEventListener("touchend", end);
  }

  function renderNote(note) {
    const el = document.createElement("div");
    el.className = "sticky-note sticky-" + note.color;
    const pos = clampToViewport(note.x, note.y);
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
    el.innerHTML = `
      <div class="sticky-handle">
        <div class="sticky-colors">
          <button type="button" class="sticky-color-btn" data-color="yellow" title="Jaune"></button>
          <button type="button" class="sticky-color-btn" data-color="pink" title="Rose"></button>
          <button type="button" class="sticky-color-btn" data-color="green" title="Vert"></button>
          <button type="button" class="sticky-color-btn" data-color="blue" title="Bleu"></button>
        </div>
        <button type="button" class="sticky-close" title="Supprimer">✕</button>
      </div>
      <textarea class="sticky-text" placeholder="Écris ta note…"></textarea>
    `;
    el.querySelector(".sticky-text").value = note.text;

    makeDraggable(el, el.querySelector(".sticky-handle"), note);

    el.querySelector(".sticky-text").addEventListener("change", (e) => updateNote(note.id, { text: e.target.value }));
    el.querySelector(".sticky-close").addEventListener("click", () => removeNote(note.id));
    el.querySelectorAll(".sticky-color-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.className = "sticky-note sticky-" + btn.dataset.color;
        updateNote(note.id, { color: btn.dataset.color });
      });
    });
    return el;
  }

  function renderAll() {
    const layer = document.getElementById("sticky-layer");
    if (!layer) return;
    layer.innerHTML = "";
    getNotes().forEach((note) => layer.appendChild(renderNote(note)));
  }

  window.StickyNotes = { addNote, renderAll };
  renderAll();

  const fab = document.getElementById("sticky-fab");
  if (fab) fab.addEventListener("click", addNote);
})();
