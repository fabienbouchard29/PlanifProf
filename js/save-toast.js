(function () {
  // Small, unobtrusive "Enregistré" confirmation on every real local save — reassurance that
  // typing into a cell/form actually persisted, without demanding attention. Rapid successive
  // saves (e.g. typing in a note) just keep it visible instead of flashing it repeatedly.
  let toastEl = null;
  let hideTimer = null;

  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement("div");
    toastEl.className = "save-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    toastEl.innerHTML = '<span class="save-toast-icon" aria-hidden="true">✓</span> Enregistré';
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function isSetupFlowOpen() {
    const onboarding = document.getElementById("onboarding-overlay");
    const landing = document.getElementById("landing-overlay");
    return (onboarding && onboarding.classList.contains("open")) || (landing && landing.classList.contains("open"));
  }

  function show() {
    if (isSetupFlowOpen()) return;
    const el = ensureToast();
    el.classList.add("visible");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => el.classList.remove("visible"), 1400);
  }

  window.addEventListener("store-set", show);
})();
