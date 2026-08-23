(function () {
  const SCOPES = ["Calendars.Read", "User.Read"];
  let msalInstance = null;
  let account = null;

  let initPromise = null;

  function createMsalInstance() {
    if (!window.MS_CONFIG || !window.MS_CONFIG.clientId) return null;
    if (typeof msal === "undefined") return null;
    if (!msalInstance) {
      msalInstance = new msal.PublicClientApplication({
        auth: {
          clientId: window.MS_CONFIG.clientId,
          authority: "https://login.microsoftonline.com/common",
          redirectUri: window.MS_CONFIG.redirectUri,
        },
        cache: { cacheLocation: "localStorage" },
      });
    }
    return msalInstance;
  }

  // MSAL v3+ requires initialize() to be awaited before any other API call.
  async function ensureReady() {
    const app = createMsalInstance();
    if (!app) return null;
    if (!initPromise) initPromise = app.initialize();
    await initPromise;
    const accounts = app.getAllAccounts();
    if (accounts.length) account = accounts[0];
    return app;
  }

  function isConfigured() {
    return !!(window.MS_CONFIG && window.MS_CONFIG.clientId);
  }

  async function signIn() {
    const app = await ensureReady();
    if (!app) throw new Error("La connexion Microsoft n'est pas encore configurée.");
    const result = await app.loginPopup({ scopes: SCOPES });
    account = result.account;
    Store.set("teamsSyncEnabled", true);
    return account;
  }

  async function signOutTeams() {
    const app = await ensureReady();
    if (app && account) {
      try {
        await app.logoutPopup({ account });
      } catch (e) {
        /* ignore */
      }
    }
    account = null;
    Store.set("teamsSyncEnabled", false);
    Store.set("teamsEvents", []);
  }

  function isSignedIn() {
    return !!account;
  }

  function getAccountLabel() {
    return account ? account.username || account.name : "";
  }

  async function getToken() {
    const app = await ensureReady();
    if (!app || !account) throw new Error("Non connecté à Microsoft.");
    try {
      const result = await app.acquireTokenSilent({ scopes: SCOPES, account });
      return result.accessToken;
    } catch (e) {
      const result = await app.acquireTokenPopup({ scopes: SCOPES, account });
      return result.accessToken;
    }
  }

  ensureReady().catch(() => {});

  function graphDateTimeToParts(dt) {
    const m = (dt || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return { date: "", time: "" };
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
  }

  function getEvents() {
    return Store.get("teamsEvents", []);
  }
  function saveEvents(list) {
    Store.set("teamsEvents", list);
  }

  async function syncNow() {
    const token = await getToken();
    const start = new Date();
    start.setDate(start.getDate() - 1);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const url =
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}` +
      `&$select=id,subject,start,end,location,isAllDay&$orderby=start/dateTime&$top=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        Prefer: 'outlook.timezone="America/Toronto"',
      },
    });
    if (!res.ok) throw new Error("Erreur Microsoft Graph (HTTP " + res.status + ")");
    const data = await res.json();
    const parsed = (data.value || []).map((ev) => {
      const startParts = graphDateTimeToParts(ev.start && ev.start.dateTime);
      return {
        id: ev.id,
        date: startParts.date,
        time: ev.isAllDay ? "" : startParts.time,
        title: ev.subject || "(sans titre)",
        location: (ev.location && ev.location.displayName) || "",
      };
    });
    saveEvents(parsed.filter((e) => e.date));
    Store.set("teamsSyncLast", new Date().toISOString());
    return parsed.length;
  }

  function addDaysIso(iso, days) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function forDate(iso) {
    return getEvents()
      .filter((e) => e.date === iso)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }

  function upcoming(fromIso, days) {
    const toIso = addDaysIso(fromIso, days);
    return getEvents()
      .filter((e) => e.date >= fromIso && e.date <= toIso)
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  }

  window.TeamsSync = { isConfigured, signIn, signOutTeams, isSignedIn, getAccountLabel, syncNow, getEvents, forDate, upcoming };
})();
