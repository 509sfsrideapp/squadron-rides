"use client";

import { getToken, isSupported, Messaging, onMessage } from "firebase/messaging";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

let messagingPromise: Promise<Messaging | null> | null = null;

async function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const supported = await isSupported();

      if (!supported || typeof window === "undefined") {
        return null;
      }

      const { getMessaging } = await import("firebase/messaging");
      const { app } = await import("./firebase");
      return getMessaging(app);
    })();
  }

  return messagingPromise;
}

function getVapidKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
}

function getDeviceId() {
  if (typeof window === "undefined") return "unknown-device";

  const storageKey = "squadron-rides-device-id";
  const existing = window.localStorage.getItem(storageKey);

  if (existing) return existing;

  const created = `device-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}

async function saveTokenToProfile(token: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You need to log in before enabling notifications.");
  }

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);
  const existingTokens = userSnap.exists() ? ((userSnap.data().notificationTokens as string[] | undefined) ?? []) : [];

  if (existingTokens.includes(token)) {
    await setDoc(userRef, {
      notificationsEnabled: true,
      notificationsUpdatedAt: new Date(),
      notificationDeviceId: getDeviceId(),
    }, { merge: true });
    return;
  }

  await setDoc(userRef, {
    notificationTokens: [...existingTokens, token],
    notificationsEnabled: true,
    notificationsUpdatedAt: new Date(),
    notificationDeviceId: getDeviceId(),
  }, { merge: true });
}

export async function enablePushNotifications() {
  if (typeof window === "undefined") {
    throw new Error("Notifications are only available in the browser.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser does not support service workers.");
  }

  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications.");
  }

  const vapidKey = getVapidKey();

  if (!vapidKey) {
    throw new Error("Missing push notification VAPID key.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = await getMessagingInstance();

  if (!messaging) {
    throw new Error("This device does not support web push.");
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("No push token was returned for this device.");
  }

  await saveTokenToProfile(token);
  return token;
}

export async function attachForegroundNotificationListener(onForegroundNotification?: (payload: { title: string; body: string }) => void) {
  const messaging = await getMessagingInstance();

  if (!messaging) {
    return () => undefined;
  }

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Squadron Rides";
    const body = payload.notification?.body || "You have a new update.";

    if (document.visibilityState === "visible" && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/window.svg",
      });
    }

    onForegroundNotification?.({ title, body });
  });
}
