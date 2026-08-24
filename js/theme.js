(function () {
  const OPTIONS = [
    { key: "colore", label: "Coloré", dot: "linear-gradient(135deg,#4f46e5,#6d5ef0)" },
    { key: "serieux", label: "Sérieux", dot: "#1f3a5f" },
    { key: "sombre", label: "Sombre", dot: "#20222f" },
    { key: "foret", label: "Forêt", dot: "linear-gradient(135deg,#3f6b3f,#6b8f4e)" },
    { key: "plage", label: "Plage", dot: "linear-gradient(135deg,#1f9aa0,#f7f2e7)" },
    { key: "automne", label: "Automne", dot: "linear-gradient(135deg,#c1682f,#d98c3d)" },
    { key: "hiver", label: "Hiver", dot: "linear-gradient(135deg,#3a72a8,#eef3f8)" },
    { key: "printemps", label: "Printemps", dot: "linear-gradient(135deg,#d6689a,#8fbf6b)" },
    { key: "tableau", label: "Tableau noir", dot: "linear-gradient(135deg,#1f3327,#cddb8a)" },
    { key: "nuit", label: "Nuit étoilée", dot: "linear-gradient(135deg,#10102a,#f0c14b)" },
    { key: "halloween", label: "Halloween", dot: "linear-gradient(135deg,#17131d,#ff8a2b)" },
    { key: "noel", label: "Noël", dot: "linear-gradient(135deg,#c1272d,#1b3322)" },
    { key: "pastel", label: "Pastel", dot: "linear-gradient(135deg,#b98cd6,#7fd4c9)" },
    { key: "cafe", label: "Café", dot: "linear-gradient(135deg,#6f4e37,#e9dccb)" },
  ];

  function get() {
    return Store.get("theme", "colore");
  }
  function set(name) {
    Store.set("theme", name);
    document.documentElement.setAttribute("data-theme", name);
  }

  // Renders a row of theme swatch buttons into `container` and wires them up. Call again
  // (or let a parent re-render) after a change if the surrounding view needs to reflect it.
  // `onSelect(key)` fires right after the theme is applied, e.g. to close a popover.
  function renderSwitcher(container, onSelect) {
    const current = get();
    container.innerHTML = OPTIONS.map(
      (o) => `
      <button type="button" class="theme-swatch ${current === o.key ? "selected" : ""}" data-theme-choice="${o.key}">
        <span class="theme-swatch-dot" style="background:${o.dot}"></span>
        ${o.label}
      </button>
    `
    ).join("");
    container.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        set(btn.dataset.themeChoice);
        container.querySelectorAll(".theme-swatch").forEach((b) => b.classList.toggle("selected", b === btn));
        if (onSelect) onSelect(btn.dataset.themeChoice);
      });
    });
  }

  let quickPopover = null;
  function closeQuickSwitcher() {
    if (quickPopover) {
      quickPopover.remove();
      quickPopover = null;
    }
  }
  function openQuickSwitcher(anchorEl) {
    if (quickPopover) {
      closeQuickSwitcher();
      return;
    }
    const pop = document.createElement("div");
    pop.className = "popover theme-popover";
    renderSwitcher(pop, closeQuickSwitcher);
    document.body.appendChild(pop);
    const rect = anchorEl.getBoundingClientRect();
    pop.style.top = window.scrollY + rect.bottom + 6 + "px";
    pop.style.left = Math.max(8, window.scrollX + rect.right - pop.offsetWidth) + "px";
    quickPopover = pop;
    setTimeout(() => {
      document.addEventListener("click", function clickHandler(e) {
        if (!pop.contains(e.target) && e.target !== anchorEl) {
          closeQuickSwitcher();
          document.removeEventListener("click", clickHandler);
        }
      });
      document.addEventListener("keydown", function keyHandler(e) {
        if (e.key === "Escape") {
          closeQuickSwitcher();
          document.removeEventListener("keydown", keyHandler);
        }
      });
    }, 0);
  }

  window.Theme = { get, set, OPTIONS, renderSwitcher, openQuickSwitcher };
})();
