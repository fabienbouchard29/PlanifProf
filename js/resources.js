(function () {
  function getResources() {
    return Store.get("resources", []);
  }
  function saveResources(r) {
    Store.set("resources", r);
  }

  let filterTag = "";
  let formOpen = false;

  function render(container) {
    container.innerHTML = "";
    const account = Account.getAccount();
    const limit = account.plan === "free" ? 20 : Infinity;

    if (!formOpen) {
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "btn btn-primary resource-add-toggle";
      openBtn.textContent = "+ Ajouter une ressource";
      openBtn.addEventListener("click", () => {
        formOpen = true;
        render(container);
      });
      container.appendChild(openBtn);
    } else {
      const form = document.createElement("form");
      form.className = "resource-form";
      form.innerHTML = `
        <input type="text" name="title" placeholder="Titre de la ressource" required />
        <input type="text" name="tags" placeholder="Étiquettes (séparées par virgules)" />
        <input type="url" name="link" placeholder="Lien (optionnel)" />
        <textarea name="description" placeholder="Description ou notes"></textarea>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="resource-cancel">Annuler</button>
          <button class="btn btn-primary" type="submit">Ajouter à la banque</button>
        </div>
      `;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const list = getResources();
        if (list.length >= limit) {
          alert(`La version gratuite est limitée à ${limit} ressources. Passez à PlanifProf Pro pour un nombre illimité.`);
          return;
        }
        list.push({
          id: Store.uuid(),
          title: form.title.value.trim(),
          tags: form.tags.value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          link: form.link.value.trim(),
          description: form.description.value.trim(),
          createdAt: new Date().toISOString().slice(0, 10),
        });
        saveResources(list);
        formOpen = false;
        render(container);
      });
      form.querySelector("#resource-cancel").addEventListener("click", () => {
        formOpen = false;
        render(container);
      });
      container.appendChild(form);
      form.querySelector('[name="title"]').focus();
    }

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Rechercher par titre ou étiquette…";
    searchInput.className = "resource-search";
    searchInput.value = filterTag;
    searchInput.addEventListener("input", () => {
      filterTag = searchInput.value.toLowerCase();
      renderList();
    });
    container.appendChild(searchInput);

    const listBox = document.createElement("div");
    listBox.className = "resource-list";
    container.appendChild(listBox);

    function renderList() {
      listBox.innerHTML = "";
      const filtered = getResources().filter(
        (r) => !filterTag || r.title.toLowerCase().includes(filterTag) || r.tags.some((t) => t.toLowerCase().includes(filterTag))
      );
      if (!filtered.length) {
        EmptyState.render(listBox, {
          icon: "📚",
          text: filterTag ? "Aucune ressource ne correspond à cette recherche." : "Votre banque est vide pour l'instant.",
          ctaLabel: filterTag ? null : "Ajouter ma première ressource",
          onClick: () => {
            formOpen = true;
            render(container);
          },
        });
        return;
      }
      filtered.forEach((r) => {
        const card = document.createElement("div");
        card.className = "resource-card";
        card.innerHTML = `
          <div class="resource-card-header">
            <strong>${r.title}</strong>
            <button type="button" class="btn btn-ghost btn-small resource-remove">✕</button>
          </div>
          ${r.description ? `<p>${r.description}</p>` : ""}
          ${r.link ? `<a href="${r.link}" target="_blank" rel="noopener">${r.link}</a>` : ""}
          <div class="tag-row">${r.tags.map((t) => `<span class="tag-chip">${t}</span>`).join("")}</div>
        `;
        card.querySelector(".resource-remove").addEventListener("click", () => {
          saveResources(getResources().filter((x) => x.id !== r.id));
          renderList();
        });
        listBox.appendChild(card);
      });
    }
    renderList();

    const limitNote = document.createElement("p");
    limitNote.className = "muted";
    limitNote.textContent =
      account.plan === "free" ? `Version gratuite : ${getResources().length}/${limit} ressources utilisées.` : "Version Pro : ressources illimitées.";
    container.appendChild(limitNote);
  }

  window.Resources = { render, getResources };
})();
