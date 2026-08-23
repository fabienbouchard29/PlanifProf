(function () {
  function getAccount() {
    return Store.get("account", { plan: "free" });
  }
  function saveAccount(a) {
    Store.set("account", a);
  }

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

  function renderAuthBox(container) {
    const box = document.createElement("div");
    box.className = "account-auth-box";
    box.innerHTML = `<h3>Compte enseignant</h3><div id="auth-content"></div>`;
    container.appendChild(box);
    const content = box.querySelector("#auth-content");

    function paint(user) {
      if (user) {
        content.innerHTML = `
          <p>Connecté en tant que <strong>${user.email || user.displayName || "compte Google"}</strong>.</p>
          <p class="muted">Vos groupes, élèves, horaire et ressources sont synchronisés automatiquement avec ce compte, sur tous vos appareils. Aucun autre enseignant ne peut voir vos données.</p>
          <button type="button" class="btn btn-ghost" id="signout-btn">Se déconnecter</button>
        `;
        content.querySelector("#signout-btn").addEventListener("click", () => FirebaseSync.signOutUser());
      } else {
        content.innerHTML = `
          <p class="muted">Créez votre compte enseignant pour synchroniser vos données entre vos appareils (ordinateur, tablette, cellulaire). Chaque enseignant a ses propres données, isolées des autres.</p>
          <form id="auth-form">
            <input type="email" name="email" placeholder="Courriel" required />
            <input type="password" name="password" placeholder="Mot de passe (6 caractères min.)" required minlength="6" />
            <div class="account-actions">
              <button type="submit" class="btn btn-primary">Se connecter</button>
              <button type="button" class="btn btn-ghost" id="signup-btn">Créer un compte</button>
              <button type="button" class="btn btn-ghost" id="google-btn">Continuer avec Google</button>
            </div>
          </form>
          <p class="muted" id="auth-error"></p>
        `;
        const form = content.querySelector("#auth-form");
        const errorEl = content.querySelector("#auth-error");
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          errorEl.textContent = "";
          try {
            await FirebaseSync.signIn(form.email.value, form.password.value);
          } catch (err) {
            errorEl.textContent = translateAuthError(err);
          }
        });
        content.querySelector("#signup-btn").addEventListener("click", async () => {
          errorEl.textContent = "";
          try {
            await FirebaseSync.signUp(form.email.value, form.password.value);
          } catch (err) {
            errorEl.textContent = translateAuthError(err);
          }
        });
        content.querySelector("#google-btn").addEventListener("click", async () => {
          errorEl.textContent = "";
          try {
            await FirebaseSync.signInGoogle();
          } catch (err) {
            errorEl.textContent = translateAuthError(err);
          }
        });
      }
    }

    if (window.FirebaseSync) {
      FirebaseSync.onAuthChange(paint);
    } else {
      content.innerHTML = '<p class="muted">Le service de connexion est en cours de chargement…</p>';
      setTimeout(() => {
        if (window.FirebaseSync) FirebaseSync.onAuthChange(paint);
        else content.innerHTML = '<p class="muted">Le service de connexion n\'a pas pu se charger (connexion internet requise).</p>';
      }, 1500);
    }
  }

  function render(container) {
    container.innerHTML = "";
    const account = getAccount();

    renderAuthBox(container);

    const themeBox = document.createElement("div");
    themeBox.className = "account-plan-box";
    const currentTheme = Theme.get();
    themeBox.innerHTML = `
      <h3>Apparence</h3>
      <p class="muted">Choisissez le style qui vous ressemble.</p>
      <div class="landing-theme-switch" style="justify-content:flex-start;">
        <button type="button" class="theme-swatch ${currentTheme === "colore" ? "selected" : ""}" data-theme-choice="colore">
          <span class="theme-swatch-dot" style="background:linear-gradient(135deg,#4f46e5,#6d5ef0)"></span>
          Coloré
        </button>
        <button type="button" class="theme-swatch ${currentTheme === "serieux" ? "selected" : ""}" data-theme-choice="serieux">
          <span class="theme-swatch-dot" style="background:#1f3a5f"></span>
          Sérieux
        </button>
      </div>
    `;
    themeBox.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Theme.set(btn.dataset.themeChoice);
        themeBox.querySelectorAll(".theme-swatch").forEach((b) => b.classList.toggle("selected", b === btn));
      });
    });
    container.appendChild(themeBox);

    const wizardBox = document.createElement("div");
    wizardBox.className = "account-plan-box";
    wizardBox.innerHTML = `
      <h3>Assistant de configuration</h3>
      <p class="muted">Reconfigurez votre horaire (jours ou cycle, périodes) et les outils activés en quelques questions.</p>
      <button type="button" class="btn btn-ghost" id="relaunch-wizard">🧭 Relancer l'assistant</button>
    `;
    wizardBox.querySelector("#relaunch-wizard").addEventListener("click", () => Onboarding.open());
    container.appendChild(wizardBox);

    const planBox = document.createElement("div");
    planBox.className = "account-plan-box";
    planBox.innerHTML = `
      <h3>Abonnement</h3>
      <p>Plan actuel : <strong>${account.plan === "pro" ? "PlanifProf Pro" : "Gratuit"}</strong></p>
      <p class="muted">Le plan gratuit limite la banque de ressources à 20 items. Le plan Pro débloque un nombre illimité de ressources. (Aucun paiement réel n'est traité ici — ceci illustre le modèle d'affaires envisagé : application web par abonnement, gratuite avec des fonctionnalités avancées payantes.)</p>
      <button type="button" class="btn btn-primary" id="toggle-plan">${account.plan === "pro" ? "Repasser au plan gratuit" : "Passer à PlanifProf Pro (démo)"}</button>
    `;
    planBox.querySelector("#toggle-plan").addEventListener("click", () => {
      saveAccount({ plan: account.plan === "pro" ? "free" : "pro" });
      render(container);
    });
    container.appendChild(planBox);

    const dataBox = document.createElement("div");
    dataBox.className = "account-data-box";
    dataBox.innerHTML = `
      <h3>Données et sauvegarde</h3>
      <p class="muted">PlanifProf enregistre vos données dans ce navigateur. Pour les transférer vers un autre appareil (téléphone, tablette), exportez une sauvegarde puis importez-la sur l'autre appareil.</p>
      <div class="account-actions">
        <button type="button" class="btn btn-ghost" id="export-json">⬇️ Exporter une sauvegarde</button>
        <label class="btn btn-ghost file-btn">⬆️ Importer une sauvegarde<input type="file" id="import-json" accept="application/json" hidden /></label>
        <button type="button" class="btn btn-ghost" id="export-ics">📅 Exporter le calendrier (.ics)</button>
        <button type="button" class="btn btn-ghost" id="print-schedule">🖨️ Imprimer l'horaire</button>
      </div>
    `;
    dataBox.querySelector("#export-json").addEventListener("click", Exports.exportJSON);
    dataBox.querySelector("#export-ics").addEventListener("click", Exports.exportICS);
    dataBox.querySelector("#print-schedule").addEventListener("click", Exports.printSchedule);
    dataBox.querySelector("#import-json").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      Exports.importJSON(file, (ok) => {
        if (ok) {
          alert("Sauvegarde importée avec succès.");
          location.reload();
        } else {
          alert("Le fichier de sauvegarde est invalide.");
        }
      });
    });
    container.appendChild(dataBox);

    const syncBox = document.createElement("div");
    syncBox.className = "account-sync-box";
    syncBox.innerHTML = `
      <h3>Synchronisation externe</h3>
      <p class="muted">La synchronisation de vos propres données PlanifProf entre appareils est maintenant automatique via votre compte enseignant ci-dessus. La synchronisation bidirectionnelle avec Google Calendar et Microsoft Teams reste séparée : utilisez l'export .ics ci-dessus, importable dans la plupart des calendriers (Google, Outlook/Teams, Apple).</p>
    `;
    container.appendChild(syncBox);
  }

  window.Account = { getAccount, saveAccount, render };
})();
