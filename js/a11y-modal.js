(function () {
  // Generic keyboard/focus behaviour for every overlay in the app (event/reminder/ocr/pdf
  // modals, the onboarding wizard, the landing screen): focus moves into the dialog on open
  // and back to the trigger on close, Tab is trapped inside it, and Escape closes it.
  const OVERLAY_SELECTOR = ".modal, .onboarding-overlay";
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let lastFocused = null;
  let activeOverlay = null;

  function getContent(overlay) {
    return overlay.querySelector(".modal-content, .onboarding-card, #landing-card") || overlay;
  }

  function focusables(overlay) {
    return Array.from(getContent(overlay).querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
  }

  function focusFirst(overlay) {
    const list = focusables(overlay);
    if (list.length) list[0].focus();
  }

  function onKeydown(e) {
    if (!activeOverlay) return;

    if (e.key === "Escape") {
      const closeBtn = activeOverlay.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.click();
      } else if (activeOverlay.id === "onboarding-overlay") {
        const skipBtn = activeOverlay.querySelector("#ob-skip");
        if (skipBtn) skipBtn.click();
      }
      // The mandatory sign-in screen has no close button when logged out — Escape does nothing.
      return;
    }

    if (e.key === "Tab") {
      const list = focusables(activeOverlay);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function observe(overlay) {
    let wasOpen = overlay.classList.contains("open");
    new MutationObserver(() => {
      const isOpen = overlay.classList.contains("open");
      if (isOpen && !wasOpen) {
        activeOverlay = overlay;
        lastFocused = document.activeElement;
        setTimeout(() => focusFirst(overlay), 0);
      } else if (!isOpen && wasOpen && activeOverlay === overlay) {
        activeOverlay = null;
        if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
        lastFocused = null;
      }
      wasOpen = isOpen;
    }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
  }

  document.querySelectorAll(OVERLAY_SELECTOR).forEach(observe);
  document.addEventListener("keydown", onKeydown);

  // Clicking the dimmed backdrop closes the simple modals (not the onboarding/landing flows,
  // which are deliberate and shouldn't be dismissed by an accidental outside click).
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target !== modal) return;
      const closeBtn = modal.querySelector(".modal-close");
      if (closeBtn) closeBtn.click();
    });
  });
})();
