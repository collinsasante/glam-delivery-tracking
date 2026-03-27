"use client";

import { useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function FcmRegistration() {
  useEffect(() => {
    if (!VAPID_KEY || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!("Notification" in window)) return;

    async function register() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        const configB64 = btoa(JSON.stringify(firebaseConfig));
        const swReg = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?config=${configB64}`
        );

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (token) {
          await fetch("/api/fcm/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        }
      } catch {
        // Non-fatal — push is optional
      }
    }

    register();
  }, []);

  return null;
}
