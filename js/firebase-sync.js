import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// "students" is synced as its own Firestore subcollection (users/{uid}/eleves/{studentId})
// so each student is a real, individually-editable document — everything else stays
// bundled together in the main users/{uid} document.
const BLOB_EXCLUDED_KEYS = ["students"];

let unsubscribeSnapshot = null;
let unsubscribeStudents = null;
let applyingRemote = false;
let pushTimer = null;
let lastKnownStudents = null;
let lastKnownDocIdMap = {};

function studentsCollectionRef(uid) {
  return collection(db, "users", uid, "eleves");
}

// Firestore document IDs must not contain "/", be exactly "." or "..", or match __*__.
function sanitizeForDocId(name) {
  let s = (name || "").trim().replace(/\//g, "-");
  if (!s || s === "." || s === "..") s = "élève";
  if (/^__.*__$/.test(s)) s = "_" + s;
  return s;
}

// Uses the student's name as the document ID (for a readable Firestore console),
// adding a numeric suffix only when two students share the same name.
function computeDocIdMap(students) {
  const used = new Set();
  const map = {};
  students.forEach((s) => {
    const base = sanitizeForDocId(s.name);
    let docId = base;
    let n = 2;
    while (used.has(docId)) {
      docId = `${base}-${n}`;
      n++;
    }
    used.add(docId);
    map[s.id] = docId;
  });
  return map;
}

function collectLocalData() {
  const data = {};
  Store.allKeys().forEach((k) => {
    const shortKey = k.slice(Store.PREFIX.length);
    if (BLOB_EXCLUDED_KEYS.includes(shortKey)) return;
    data[shortKey] = JSON.parse(localStorage.getItem(k));
  });
  data.students = deleteField();
  return data;
}

async function pushAllData() {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), collectLocalData(), { merge: true });
  } catch (e) {
    console.error("PlanifProf: échec de synchronisation vers le serveur", e);
  }
}

function scheduleDataPush() {
  if (!auth.currentUser) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushAllData, 800);
}

function applyRemoteData(data) {
  applyingRemote = true;
  Object.entries(data).forEach(([key, value]) => {
    if (BLOB_EXCLUDED_KEYS.includes(key)) return;
    Store.set(key, value, { silent: true });
  });
  applyingRemote = false;
  document.dispatchEvent(new CustomEvent("cloud-data-changed"));
}

async function syncStudentsToFirestore(uid, students) {
  const ref = studentsCollectionRef(uid);
  const prevDocIdMap = lastKnownDocIdMap;
  const nextDocIdMap = computeDocIdMap(students);
  const nextInternalIds = new Set(students.map((s) => s.id));

  lastKnownStudents = students;
  lastKnownDocIdMap = nextDocIdMap;

  const writes = students.map((s) => setDoc(doc(ref, nextDocIdMap[s.id]), s));
  Object.entries(prevDocIdMap).forEach(([internalId, oldDocId]) => {
    const stillExists = nextInternalIds.has(internalId);
    const renamed = stillExists && nextDocIdMap[internalId] !== oldDocId;
    if (!stillExists || renamed) writes.push(deleteDoc(doc(ref, oldDocId)));
  });

  try {
    await Promise.all(writes);
  } catch (e) {
    console.error("PlanifProf: échec de synchronisation des élèves", e);
  }
}

window.addEventListener("store-set", (e) => {
  if (applyingRemote) return;
  const key = e.detail && e.detail.key;
  if (key === "students") {
    if (auth.currentUser) syncStudentsToFirestore(auth.currentUser.uid, e.detail.value);
    return;
  }
  scheduleDataPush();
});

const authListeners = [];
function onAuthChange(cb) {
  authListeners.push(cb);
  cb(auth.currentUser);
}

function updateBadge(user) {
  const dot = document.getElementById("sync-status");
  const avatar = document.getElementById("account-avatar");
  const button = document.getElementById("account-button");
  if (dot) {
    dot.title = user ? `Connecté (${user.email || "compte Google"}) — synchronisé` : "Non connecté — données locales seulement";
    dot.classList.toggle("connected", !!user);
  }
  if (avatar) {
    const chosen = Store.get("accountAvatar", null);
    avatar.textContent = chosen || (user && user.email ? user.email[0].toUpperCase() : "👤");
  }
  if (button) {
    button.title = user ? `Compte — ${user.email || "compte Google"}` : "Compte (non connecté)";
  }
}

onAuthStateChanged(auth, (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  if (unsubscribeStudents) {
    unsubscribeStudents();
    unsubscribeStudents = null;
  }
  lastKnownStudents = null;
  lastKnownDocIdMap = {};

  if (user) {
    const ref = doc(db, "users", user.uid);
    unsubscribeSnapshot = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        applyRemoteData(snap.data());
      } else {
        pushAllData();
      }
    });

    unsubscribeStudents = onSnapshot(studentsCollectionRef(user.uid), (snap) => {
      if (snap.empty) {
        const local = Store.get("students", []);
        if (local.length > 0) {
          lastKnownStudents = [];
          lastKnownDocIdMap = {};
          syncStudentsToFirestore(user.uid, local);
          return;
        }
      }
      const remoteStudents = snap.docs.map((d) => d.data());
      const docIdMap = {};
      snap.docs.forEach((d) => {
        docIdMap[d.data().id] = d.id;
      });
      lastKnownStudents = remoteStudents;
      lastKnownDocIdMap = docIdMap;
      applyingRemote = true;
      Store.set("students", remoteStudents, { silent: true });
      applyingRemote = false;
      document.dispatchEvent(new CustomEvent("cloud-data-changed"));
    });
  }
  authListeners.forEach((cb) => cb(user));
});

onAuthChange(updateBadge);

function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
function signInGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}
async function signOutUser() {
  await signOut(auth);
  // Clear the local cache so another person on this device doesn't see this
  // teacher's data before signing in with their own account.
  Store.allKeys().forEach((k) => localStorage.removeItem(k));
  location.reload();
}
function getCurrentUser() {
  return auth.currentUser;
}

window.FirebaseSync = { signUp, signIn, signInGoogle, signOutUser, getCurrentUser, onAuthChange };
