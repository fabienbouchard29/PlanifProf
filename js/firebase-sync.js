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
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

let unsubscribeSnapshot = null;
let applyingRemote = false;
let pushTimer = null;

function collectLocalData() {
  const data = {};
  Store.allKeys().forEach((k) => {
    const shortKey = k.slice(Store.PREFIX.length);
    data[shortKey] = JSON.parse(localStorage.getItem(k));
  });
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
  Object.entries(data).forEach(([key, value]) => Store.set(key, value, { silent: true }));
  applyingRemote = false;
  document.dispatchEvent(new CustomEvent("cloud-data-changed"));
}

window.addEventListener("store-set", () => {
  if (applyingRemote) return;
  scheduleDataPush();
});

const authListeners = [];
function onAuthChange(cb) {
  authListeners.push(cb);
  cb(auth.currentUser);
}

function updateBadge(user) {
  const el = document.getElementById("sync-status");
  if (!el) return;
  el.textContent = user ? `Connecté (${user.email || "compte Google"}) — synchronisé` : "Non connecté — données locales seulement";
}

onAuthStateChanged(auth, (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  if (user) {
    const ref = doc(db, "users", user.uid);
    unsubscribeSnapshot = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        applyRemoteData(snap.data());
      } else {
        pushAllData();
      }
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
function signOutUser() {
  return signOut(auth);
}
function getCurrentUser() {
  return auth.currentUser;
}

window.FirebaseSync = { signUp, signIn, signInGoogle, signOutUser, getCurrentUser, onAuthChange };
