import "server-only";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getPrivateKey() {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!key) return null; // Graceful degradation for build-time collection
  return key.replace(/\\n/g, "\n");
}

function getFirebaseAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  // During next build, these vars might not be available
  if (!projectId || !clientEmail || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
     console.warn("Missing Firebase Admin credentials. Initializing dummy app for build sequence.");
     return initializeApp({ projectId: "dummy-project" }, "dummy");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: getPrivateKey(),
    }),
    projectId,
  });
}

export const firebaseAdminApp = getFirebaseAdminApp();

// Use dynamic getters to avoid breaking static compilation if the dummy app was loaded
export const getAdminAuth = () => getAuth(getApps().find(app => app.name === "[DEFAULT]"));
export const getAdminDb = () => getFirestore(getApps().find(app => app.name === "[DEFAULT]"));
