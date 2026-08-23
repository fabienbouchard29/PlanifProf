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

    const teamsBox = document.createElement("div");
    teamsBox.className = "account-sync-box";
    const teamsSignedIn = TeamsSync.isSignedIn();
    const teamsLast = Store.get("teamsSyncLast", "");
    const teamsCount = TeamsSync.getEvents().length;
    if (!TeamsSync.isConfigured()) {
      teamsBox.innerHTML = `
        <h3>Réunions Teams (connexion Microsoft)</h3>
        <p class="muted">Bientôt disponible — configuration en cours.</p>
      `;
    } else if (teamsSignedIn) {
      teamsBox.innerHTML = `
        <h3>Réunions Teams (connexion Microsoft)</h3>
        <p class="muted">Connecté en tant que <strong>${TeamsSync.getAccountLabel()}</strong>.</p>
        <p class="muted" id="teams-status">${teamsCount ? `${teamsCount} réunion(s) synchronisée(s)${teamsLast ? " · dernière synchro : " + new Date(teamsLast).toLocaleString("fr-CA") : ""}.` : "Aucune réunion pour l'instant — cliquez Synchroniser."}</p>
        <div class="account-actions">
          <button type="button" class="btn btn-primary" id="teams-sync-btn">🔄 Synchroniser maintenant</button>
          <button type="button" class="btn btn-ghost" id="teams-signout-btn">Déconnecter</button>
        </div>
      `;
      teamsBox.querySelector("#teams-sync-btn").addEventListener("click", async () => {
        const statusEl = teamsBox.querySelector("#teams-status");
        statusEl.textContent = "Synchronisation en cours…";
        try {
          const n = await TeamsSync.syncNow();
          statusEl.textContent = `✓ ${n} réunion(s) synchronisée(s).`;
          if (window.rerenderCurrentView) window.rerenderCurrentView();
        } catch (err) {
          statusEl.textContent = "Erreur de synchronisation : " + err.message;
        }
      });
      teamsBox.querySelector("#teams-signout-btn").addEventListener("click", async () => {
        await TeamsSync.signOutTeams();
        render(container);
      });
    } else {
      teamsBox.innerHTML = `
        <h3>Réunions Teams (connexion Microsoft)</h3>
        <p class="muted">Connectez votre compte Microsoft de l'école pour voir vos réunions Teams directement dans l'Agenda — lecture seule de votre calendrier, rien d'autre.</p>
        <button type="button" class="btn btn-primary" id="teams-signin-btn">🔗 Se connecter avec Microsoft</button>
        <p class="muted" id="teams-status"></p>
      `;
      teamsBox.querySelector("#teams-signin-btn").addEventListener("click", async () => {
        const statusEl = teamsBox.querySelector("#teams-status");
        statusEl.textContent = "";
        try {
          await TeamsSync.signIn();
          const n = await TeamsSync.syncNow();
          statusEl.textContent = `✓ Connecté et synchronisé (${n} réunion(s)).`;
          render(container);
          if (window.rerenderCurrentView) window.rerenderCurrentView();
        } catch (err) {
          statusEl.textContent = "Connexion impossible : " + err.message;
        }
      });
    }
    container.appendChild(teamsBox);

    const syncBox = document.createElement("div");
    syncBox.className = "account-sync-box";
    const outlookCfg = OutlookSync.getSyncConfig();
    const outlookCount = OutlookSync.getEvents().length;
    syncBox.innerHTML = `
      <h3>Solution de secours (lien ou fichier .ics)</h3>
      <p class="muted">Si la connexion Microsoft ci-dessus ne fonctionne pas pour votre organisation, utilisez plutôt un lien de calendrier publié d'Outlook, ou importez un fichier .ics téléchargé.</p>
      <p class="muted" id="outlook-status">${outlookCount ? `${outlookCount} réunion(s) synchronisée(s)${outlookCfg.lastSync ? " · dernière synchro : " + new Date(outlookCfg.lastSync).toLocaleString("fr-CA") : ""}.` : "Aucune réunion synchronisée pour l'instant."}</p>
      <div class="account-actions" style="margin-bottom:0.6rem;">
        <input type="url" id="outlook-url" placeholder="Lien du calendrier Outlook publié (.ics)" value="${outlookCfg.icsUrl || ""}" style="flex:1; min-width:220px; padding:0.5rem; border:1px solid var(--border); border-radius:var(--radius-sm); font-family:inherit;" />
        <button type="button" class="btn btn-primary" id="outlook-sync-btn">🔄 Synchroniser</button>
      </div>
      <div class="account-actions">
        <label class="btn btn-ghost file-btn">📎 Importer un fichier .ics téléchargé<input type="file" id="outlook-file-input" accept=".ics,text/calendar" hidden /></label>
      </div>
      <p class="muted" id="outlook-help" style="margin-top:0.5rem;">Comment obtenir le lien : dans Outlook (web) → Paramètres → Calendrier → Calendriers partagés → « Publier un calendrier » → copiez le lien .ics. Si votre organisation bloque ce lien pour une synchro automatique, le fichier téléchargé fonctionne toujours.</p>
    `;
    container.appendChild(syncBox);

    syncBox.querySelector("#outlook-sync-btn").addEventListener("click", async () => {
      const url = syncBox.querySelector("#outlook-url").value.trim();
      const statusEl = syncBox.querySelector("#outlook-status");
      if (!url) return;
      statusEl.textContent = "Synchronisation en cours…";
      try {
        const result = await OutlookSync.syncFromUrl(url);
        statusEl.textContent = `✓ ${result.total} réunion(s) synchronisée(s) (${result.added} nouvelle(s)).`;
        if (window.rerenderCurrentView) window.rerenderCurrentView();
      } catch (err) {
        statusEl.textContent = "La synchronisation automatique a échoué (souvent bloquée par Microsoft pour les liens Outlook — CORS). Utilisez plutôt l'import de fichier .ics ci-dessous.";
      }
    });

    syncBox.querySelector("#outlook-file-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = syncBox.querySelector("#outlook-status");
      try {
        const result = await OutlookSync.importFromFile(file);
        statusEl.textContent = `✓ ${result.total} réunion(s) importée(s) (${result.added} nouvelle(s)).`;
        if (window.rerenderCurrentView) window.rerenderCurrentView();
      } catch (err) {
        statusEl.textContent = "Le fichier n'a pas pu être lu. Vérifiez que c'est bien un fichier .ics.";
      }
    });
  }

  window.Account = { getAccount, saveAccount, render };
})();
