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
    if (id === "sub-presences") Attendance.render(container);
  }

  tabs.forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
  subTabs.forEach((t) => t.addEventListener("click", () => showSubView(t.dataset.subview)));

  ["config-changed", "template-changed", "subjects-changed"].forEach((evt) => {
    document.addEventListener(evt, () => {
      const activeView = document.querySelector(".view.active");
      if (activeView && activeView.id === "view-calendrier") CalendarView.render(activeView);
    });
  });

  let lastLocalEditAt = 0;
  window.addEventListener("store-set", () => {
    lastLocalEditAt = Date.now();
  });

  document.addEventListener("cloud-data-changed", () => {
    // Skip: (1) echoes of our own very-recent edit bouncing back from the sync round-trip,
    // (2) the settings screen, which has open/closed panels that a full re-render would collapse.
    if (Date.now() - lastLocalEditAt < 2500) return;
    const activeView = document.querySelector(".view.active");
    if (activeView && activeView.id === "view-horaire") return;
    rerenderCurrentView();
  });

  const MODULE_TAB_MAP = {
    ressources: '[data-view="view-ressources"]',
    evaluations: '[data-subview="sub-evaluations"]',
    equipes: '[data-subview="sub-equipes"]',
    pigeage: '[data-subview="sub-pigeage"]',
    presences: '[data-subview="sub-presences"]',
  };

  function applyModuleVisibility() {
    Object.entries(MODULE_TAB_MAP).forEach(([moduleKey, selector]) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.style.display = Modules.isEnabled(moduleKey) ? "" : "none";
    });

    const activeTab = document.querySelector(".main-tab.active");
    if (activeTab && activeTab.style.display === "none") {
      const firstVisible = Array.from(tabs).find((t) => t.style.display !== "none");
      if (firstVisible) showView(firstVisible.dataset.view);
    }
    const activeSubTab = document.querySelector(".sub-tab.active");
    if (activeSubTab && activeSubTab.style.display === "none") {
      const firstVisibleSub = Array.from(subTabs).find((t) => t.style.display !== "none");
      if (firstVisibleSub) showSubView(firstVisibleSub.dataset.subview);
    }
  }

  function rerenderCurrentView() {
    const activeView = document.querySelector(".view.active");
    if (activeView) renderActive(activeView.id);
  }

  window.applyModuleVisibility = applyModuleVisibility;
  window.rerenderCurrentView = rerenderCurrentView;

  applyModuleVisibility();
  showView("view-calendrier");

  function handleEntryScreen(user) {
    if (user) {
      Landing.close();
      return;
    }
    if (!Config.getConfig()) Landing.open();
  }

  function watchAuthForEntryScreen() {
    if (window.FirebaseSync) {
      FirebaseSync.onAuthChange(handleEntryScreen);
    } else {
      setTimeout(() => {
        if (window.FirebaseSync) FirebaseSync.onAuthChange(handleEntryScreen);
        else if (Onboarding.shouldShowOnboarding()) Onboarding.open();
      }, 1500);
    }
  }
  watchAuthForEntryScreen();
})();
