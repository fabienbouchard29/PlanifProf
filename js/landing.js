(function () {
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
    card.innerHTML = `
      <div class="landing-brand">
        <span class="brand-mark">📘</span>
        <h1>PlanifProf</h1>
      </div>
      <p class="landing-pitch">Le planificateur numérique flexible pour enseignants — horaire, agenda, élèves, ressources et présences, synchronisés automatiquement entre vos appareils.</p>
      <div id="landing-auth-area"></div>
      <button type="button" class="btn btn-ghost landing-skip" id="landing-skip">Continuer sans compte</button>
    `;
    renderChoice(card.querySelector("#landing-auth-area"));
    card.querySelector("#landing-skip").addEventListener("click", () => {
      close();
      Onboarding.open();
    });
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
