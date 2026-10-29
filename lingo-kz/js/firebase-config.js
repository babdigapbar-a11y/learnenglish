/* ============================================================================
   FIREBASE — СЮДА ВСТАВЛЯТЬ КЛЮЧИ
   ----------------------------------------------------------------------------
   Firebase Console → ⚙ Project settings → General → Your apps → Web app (</>)
   → блок "SDK setup and configuration" → "Config".
   Скопируйте значения и замените строки "YOUR_..." ниже. Подробно: FIREBASE_SETUP.md

   Пока в apiKey / projectId стоит "YOUR_...", сайт работает в ДЕМО-режиме
   (данные в localStorage браузера, регистрация только на этом компьютере).
   ============================================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyA_cuoB0mGei6hHX_gkiNq4pSXqg2kOGgM",
  authDomain: "balym-cours.firebaseapp.com",
  projectId: "balym-cours",
  storageBucket: "balym-cours.firebasestorage.app",
  messagingSenderId: "698175997496",
  appId: "1:698175997496:web:178c7e21711db82c7148cd",
  measurementId: "G-3GNNLLJPXY"
};

/** Включить при локальном firebase emulator (docker compose --profile emulator). */
export const USE_EMULATOR = false;

export const isDemoMode = /YOUR_/i.test(firebaseConfig.apiKey) || /YOUR_/i.test(firebaseConfig.projectId);

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
let cachedAuth = null;
let cachedDb = null;

/** Firebase App + Auth. Firestore здесь НЕ грузится — он тяжёлый и нужен не на всех страницах. */
export async function getFirebase() {
  if (isDemoMode) return { app: null, auth: null, db: null };
  if (!cachedAuth) {
    cachedAuth = (async () => {
      const [appMod, authMod] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`)]);
      const app = appMod.initializeApp(firebaseConfig);
      const auth = authMod.getAuth(app);
      if (USE_EMULATOR && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
        authMod.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      }
      return { app, auth };
    })();
  }
  const base = await cachedAuth;
  return { ...base, db: cachedDb };
}

/** Firestore подгружается лениво — только когда реально нужна база. */
export async function getDb() {
  if (isDemoMode) return null;
  if (!cachedDb) {
    cachedDb = (async () => {
      const [{ app }, fsMod] = await Promise.all([getFirebase(), import(`${SDK}/firebase-firestore.js`)]);
      /* постоянный кеш в IndexedDB: повторные чтения и подписки отдаются мгновенно, даже до ответа сервера */
      let db;
      try {
        db = fsMod.initializeFirestore(app, {
          localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }),
        });
      } catch (e) {
        db = fsMod.getFirestore(app);
      }
      if (USE_EMULATOR && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
        fsMod.connectFirestoreEmulator(db, "127.0.0.1", 8081);
      }
      return db;
    })();
  }
  return cachedDb;
}
