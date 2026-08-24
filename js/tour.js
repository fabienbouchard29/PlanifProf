(function () {
  const STEPS = [
    {
      selector: ".calendar-cell-note",
      title: "Écrivez directement ici",
      text: "Cliquez dans une case et tapez, comme sur un agenda papier. La période et la matière restent affichées au-dessus, elles ne bougent pas.",
    },
    {
      selector: "#sticky-fab",
      title: "Un post-it, n'importe où",
      text: "Ajoutez une note libre et glissez-la où vous voulez sur l'écran — pratique pour un pense-bête rapide.",
    },
    {
      selector: "#account-button",
      title: "Toujours sauvegardé",
      text: "Votre compte enseignant synchronise tout, automatiquement, entre vos appareils.",
    },
    {
      selector: "#settings-button",
      title: "Personnalisez à votre rythme",
      text: "Horaire, matières, apparence, outils affichés… tout se change ici, quand vous voulez.",
    },
  ];

  let stepIndex = 0;
  let cardEl = null;

  function cleanup() {
    document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
    if (cardEl) {
      cardEl.remove();
      cardEl = null;
    }
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("resize", reposition);
  }

  function onKeydown(e) {
    if (e.key === "Escape") end();
  }

  function reposition() {
    if (!cardEl) return;
    const step = STEPS[stepIndex];
    const target = document.querySelector(step.selector);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    let top = r.bottom + 12;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - cardRect.width - 8);
    if (top + cardRect.height > window.innerHeight - 8) top = Math.max(8, r.top - cardRect.height - 12);
    cardEl.style.top = top + window.scrollY + "px";
    cardEl.style.left = left + window.scrollX + "px";
  }

  function end() {
    cleanup();
    Store.set("tourSeen", true);
  }

  function showStep() {
    document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
    if (cardEl) cardEl.remove();

    while (stepIndex < STEPS.length && !document.querySelector(STEPS[stepIndex].selector)) stepIndex++;
    if (stepIndex >= STEPS.length) {
      end();
      return;
    }

    const step = STEPS[stepIndex];
    const target = document.querySelector(step.selector);
    target.classList.add("tour-highlight");
    target.scrollIntoView({ block: "center", behavior: "smooth" });

    cardEl = document.createElement("div");
    cardEl.className = "tour-card";
    cardEl.setAttribute("role", "dialog");
    cardEl.setAttribute("aria-label", step.title);
    cardEl.innerHTML = `
      <p class="tour-step-count">${stepIndex + 1} / ${STEPS.length}</p>
      <h4>${step.title}</h4>
      <p>${step.text}</p>
      <div class="tour-actions">
        <button type="button" class="btn btn-ghost" id="tour-skip">Passer</button>
        <button type="button" class="btn btn-primary" id="tour-next">${stepIndex === STEPS.length - 1 ? "Terminer" : "Suivant"}</button>
      </div>
    `;
    document.body.appendChild(cardEl);
    reposition();

    cardEl.querySelector("#tour-skip").addEventListener("click", end);
    cardEl.querySelector("#tour-next").addEventListener("click", () => {
      stepIndex++;
      showStep();
    });
    cardEl.querySelector("#tour-next").focus();
  }

  function start() {
    cleanup();
    if (window.AppNav) window.AppNav.showView("view-calendrier");
    stepIndex = 0;
    Store.set("tourSeen", true);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", reposition);
    setTimeout(showStep, 150);
  }

  function maybeAutoStart() {
    if (Store.get("tourSeen", false)) return;
    setTimeout(start, 600);
  }

  window.Tour = { start, maybeAutoStart };
})();
