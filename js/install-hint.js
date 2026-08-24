(function () {
  let deferredPrompt = null;
  let bannerEl = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function isMobile() {
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function hideBanner() {
    if (bannerEl) {
      bannerEl.remove();
      bannerEl = null;
    }
  }

  function dismiss() {
    hideBanner();
    Store.set("installHintSeen", true);
  }

  function showBanner() {
    hideBanner();

    if (isStandalone()) {
      alert("PlanifProf est déjà installé sur cet appareil !");
      return;
    }

    let text;
    let showInstallBtn = false;
    if (isIOS()) {
      text = "📲 Installez PlanifProf comme une application : appuyez sur <strong>Partager</strong> (le carré avec la flèche), puis « <strong>Sur l'écran d'accueil</strong> ».";
    } else if (deferredPrompt) {
      text = "📲 Installez PlanifProf comme une application pour l'ouvrir en plein écran, sans barre d'adresse.";
      showInstallBtn = true;
    } else {
      text = "📲 Vous pouvez installer PlanifProf : ouvrez le menu ⋮ de votre navigateur puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».";
    }

    bannerEl = document.createElement("div");
    bannerEl.className = "install-hint";
    bannerEl.setAttribute("role", "status");
    bannerEl.innerHTML = `
      <span class="install-hint-text">${text}</span>
      <div class="install-hint-actions">
        ${showInstallBtn ? '<button type="button" class="btn btn-primary btn-small" id="install-hint-install">Installer</button>' : ""}
        <button type="button" class="btn btn-ghost btn-small" id="install-hint-close" aria-label="Fermer">✕</button>
      </div>
    `;
    document.body.appendChild(bannerEl);

    const installBtn = bannerEl.querySelector("#install-hint-install");
    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) {
          dismiss();
          return;
        }
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        dismiss();
      });
    }
    bannerEl.querySelector("#install-hint-close").addEventListener("click", dismiss);
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener("appinstalled", () => {
    dismiss();
  });

  function isSetupFlowOpen() {
    const onboarding = document.getElementById("onboarding-overlay");
    const landing = document.getElementById("landing-overlay");
    return (onboarding && onboarding.classList.contains("open")) || (landing && landing.classList.contains("open"));
  }

  function maybeShow() {
    if (isStandalone() || !isMobile() || Store.get("installHintSeen", false)) return;
    setTimeout(() => {
      if (isSetupFlowOpen()) return;
      showBanner();
    }, 4000);
  }

  window.InstallHint = { maybeShow, showBanner, isStandalone };
  maybeShow();
})();
