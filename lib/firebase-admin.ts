import "server-only";
import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

function auth() {
  return getAuth(getAdminApp());
}

export const adminAuth = {
  verifyIdToken: (token: string) => auth().verifyIdToken(token),
  createUser: (props: Parameters<ReturnType<typeof getAuth>["createUser"]>[0]) => auth().createUser(props),
  getUserByEmail: (email: string) => auth().getUserByEmail(email),
  updateUser: (uid: string, props: Parameters<ReturnType<typeof getAuth>["updateUser"]>[1]) => auth().updateUser(uid, props),
  deleteUser: (uid: string) => auth().deleteUser(uid),
};
