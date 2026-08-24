(function () {
  const FEATURES = [
    { icon: "🗓️", label: "Horaire flexible", desc: "Semaine ou cycle, périodes et pauses sur mesure." },
    { icon: "📅", label: "Agenda synchronisé", desc: "Vos cours et rappels, sur tous vos appareils." },
    { icon: "✅", label: "Présences", desc: "Prise de présences par groupe, jour par jour." },
    { icon: "🤝", label: "Équipes & pige", desc: "Équipes équilibrées, sélection au hasard." },
    { icon: "🔔", label: "Rappels", desc: "Réunions, anniversaires, échéances — rien d'oublié." },
    { icon: "📚", label: "Ressources", desc: "Votre banque personnelle, d'année en année." },
  ];

  let dismissible = false;

  function translateAuthError(err) {
    const map = {
      "auth/email-already-in-use": "Ce courriel est déjà associé à un compte — essayez plutôt de vous connecter.",
      "auth/invalid-email": "Courriel invalide.",
      "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
      "auth/wrong-password": "Mot de passe incorrect.",
      "auth/user-not-found": "Aucun compte avec ce courriel.",
      "auth/invalid-credential": "Courriel ou mot de passe incorrect.",
      "auth/popup-closed-by-user": "Connexion annulée.",
    };
    return map[err.code] || "Erreur : " + err.message;
  }

  function ensureFirebaseReady(cb) {
    if (window.FirebaseSync) {
      cb();
    } else {
      setTimeout(() => ensureFirebaseReady(cb), 300);
    }
  }

  function renderThemeSwitcher(container) {
    const current = Theme.get();
    const box = document.createElement("div");
    box.className = "landing-theme-switch";
    box.innerHTML = `
      <button type="button" class="theme-swatch ${current === "colore" ? "selected" : ""}" data-theme-choice="colore">
        <span class="theme-swatch-dot" style="background:linear-gradient(135deg,#4f46e5,#6d5ef0)"></span>
        Coloré
      </button>
      <button type="button" class="theme-swatch ${current === "serieux" ? "selected" : ""}" data-theme-choice="serieux">
        <span class="theme-swatch-dot" style="background:#1f3a5f"></span>
        Sérieux
      </button>
    `;
    box.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Theme.set(btn.dataset.themeChoice);
        box.querySelectorAll(".theme-swatch").forEach((b) => b.classList.toggle("selected", b === btn));
      });
    });
    container.appendChild(box);
  }

  function renderChoice(authArea) {
    authArea.innerHTML = `
      <div class="landing-choice">
        <button type="button" class="btn btn-primary" id="landing-signup-btn">Créer un compte</button>
        <button type="button" class="btn btn-ghost" id="landing-signin-btn">Se connecter</button>
      </div>
    `;
    authArea.querySelector("#landing-signup-btn").addEventListener("click", () => renderForm(authArea, "signup"));
    authArea.querySelector("#landing-signin-btn").addEventListener("click", () => renderForm(authArea, "signin"));
  }

  function renderForm(authArea, mode) {
    authArea.innerHTML = `
      <form id="landing-auth-form" class="landing-form">
        <input type="email" name="email" placeholder="Courriel" required />
        <input type="password" name="password" placeholder="Mot de passe (6 caractères min.)" required minlength="6" />
        <button type="submit" class="btn btn-primary">${mode === "signup" ? "Créer mon compte" : "Se connecter"}</button>
        <button type="button" class="btn btn-ghost" id="landing-google-btn">Continuer avec Google</button>
        <button type="button" class="btn btn-ghost" id="landing-back-btn">◀ Retour</button>
      </form>
      <p class="muted" id="landing-auth-error"></p>
    `;
    const form = authArea.querySelector("#landing-auth-form");
    const errorEl = authArea.querySelector("#landing-auth-error");

    authArea.querySelector("#landing-back-btn").addEventListener("click", () => renderChoice(authArea));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      ensureFirebaseReady(async () => {
        try {
          if (mode === "signup") {
            await FirebaseSync.signUp(form.email.value, form.password.value);
            close();
            Onboarding.open();
          } else {
            await FirebaseSync.signIn(form.email.value, form.password.value);
            close();
          }
        } catch (err) {
          errorEl.textContent = translateAuthError(err);
        }
      });
    });

    authArea.querySelector("#landing-google-btn").addEventListener("click", () => {
      errorEl.textContent = "";
      ensureFirebaseReady(async () => {
        try {
          await FirebaseSync.signInGoogle();
          close();
          if (mode === "signup") Onboarding.open();
        } catch (err) {
          errorEl.textContent = translateAuthError(err);
        }
      });
    });
  }

  function renderContent() {
    const card = document.getElementById("landing-card");
    const isLoggedIn = !!(window.FirebaseSync && FirebaseSync.getCurrentUser());

    card.innerHTML = `
      ${isLoggedIn ? '<button type="button" class="modal-close landing-close" id="landing-close-btn" aria-label="Fermer">✕</button>' : ""}
      <div class="landing-brand">
        <span class="brand-mark">📘</span>
        <h1>PlanifProf</h1>
      </div>
      <p class="landing-pitch">Le planificateur numérique flexible pour enseignants — horaire, agenda, élèves, ressources et présences, synchronisés automatiquement entre vos appareils.</p>
      <div id="landing-theme-area"></div>
      <div class="landing-features"></div>
      <div id="landing-auth-area"></div>
    `;

    if (isLoggedIn) {
      card.querySelector("#landing-close-btn").addEventListener("click", close);
    }

    renderThemeSwitcher(card.querySelector("#landing-theme-area"));

    const featuresBox = card.querySelector(".landing-features");
    featuresBox.innerHTML = FEATURES.map(
      (f) => `
      <div class="landing-feature">
        <span class="landing-feature-icon">${f.icon}</span>
        <span class="landing-feature-text"><strong>${f.label}</strong><br /><span class="muted">${f.desc}</span></span>
      </div>
    `
    ).join("");

    const authArea = card.querySelector("#landing-auth-area");
    if (isLoggedIn) {
      authArea.innerHTML = `<button type="button" class="btn btn-primary" id="landing-continue-btn">Ouvrir mon Agenda →</button>`;
      authArea.querySelector("#landing-continue-btn").addEventListener("click", close);
    } else {
      renderChoice(authArea);
    }
  }

  function open() {
    const overlay = document.getElementById("landing-overlay");
    overlay.classList.add("open");
    renderContent();
  }

  function close() {
    document.getElementById("landing-overlay").classList.remove("open");
  }

  window.Landing = { open, close };
})();
