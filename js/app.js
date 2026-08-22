(function () {
  const tabs = document.querySelectorAll(".main-tab");
  const views = document.querySelectorAll(".view");
  const subTabs = document.querySelectorAll(".sub-tab");
  const subViews = document.querySelectorAll(".subview");

  function showView(id) {
    views.forEach((v) => v.classList.toggle("active", v.id === id));
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.view === id));
    renderActive(id);
  }
  function showSubView(id) {
    subViews.forEach((v) => v.classList.toggle("active", v.id === id));
    subTabs.forEach((t) => t.classList.toggle("active", t.dataset.subview === id));
    renderActiveSub(id);
  }

  function renderActive(id) {
    if (id === "view-horaire") TemplateView.render(document.getElementById("view-horaire"));
    if (id === "view-calendrier") CalendarView.render(document.getElementById("view-calendrier"));
    if (id === "view-eleves") {
      const activeSub = document.querySelector(".sub-tab.active");
      renderActiveSub(activeSub ? activeSub.dataset.subview : "sub-groupes");
    }
    if (id === "view-ressources") Resources.render(document.getElementById("view-ressources"));
    if (id === "view-compte") Account.render(document.getElementById("view-compte"));
  }
  function renderActiveSub(id) {
    const container = document.getElementById(id);
    if (!container) return;
    if (id === "sub-groupes") Students.render(container);
    if (id === "sub-evaluations") Evaluations.render(container);
    if (id === "sub-equipes") Teams.render(container);
    if (id === "sub-pigeage") Picker.render(container);
  }

  tabs.forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
  subTabs.forEach((t) => t.addEventListener("click", () => showSubView(t.dataset.subview)));

  ["config-changed", "template-changed", "subjects-changed"].forEach((evt) => {
    document.addEventListener(evt, () => {
      const activeView = document.querySelector(".view.active");
      if (activeView && activeView.id === "view-calendrier") CalendarView.render(activeView);
    });
  });

  showView("view-horaire");
})();
