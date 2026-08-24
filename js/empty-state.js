(function () {
  // Friendly "nothing here yet" block with an optional call-to-action button
  // that can jump straight to the screen where the user needs to act.
  function render(container, opts) {
    const box = document.createElement("div");
    box.className = "empty-state";
    box.innerHTML = `
      <span class="empty-state-icon" aria-hidden="true">${opts.icon || "📭"}</span>
      <p>${opts.text}</p>
      ${opts.ctaLabel ? `<button type="button" class="btn btn-primary">${opts.ctaLabel}</button>` : ""}
    `;
    if (opts.ctaLabel && opts.onClick) {
      box.querySelector("button").addEventListener("click", opts.onClick);
    }
    container.appendChild(box);
    return box;
  }

  window.EmptyState = { render };
})();
