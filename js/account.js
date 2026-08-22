(function () {
  function getAccount() {
    return Store.get("account", { plan: "free" });
  }
  function saveAccount(a) {
    Store.set("account", a);
  }

  function render(container) {
    container.innerHTML = "";
    const account = getAccount();

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
      <p class="muted">L'intégration directe avec Google Calendar et Microsoft Teams (synchronisation automatique dans les deux sens) nécessite un serveur et une authentification OAuth — non incluse dans cette version web statique. En attendant, utilisez l'export .ics ci-dessus : la plupart des calendriers (Google, Outlook/Teams, Apple) peuvent l'importer.</p>
    `;
    container.appendChild(syncBox);
  }

  window.Account = { getAccount, saveAccount, render };
})();
