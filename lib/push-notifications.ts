"use client";

import { deleteToken, getToken, isSupported, Messaging, onMessage } from "firebase/messaging";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

let messagingPromise: Promise<Messaging | null> | null = null;
const deviceIdStorageKey = "squadron-rides-device-id";
const pushTokenStorageKey = "squadron-rides-push-token";

type NotificationTokenMap = Record<string, string>;

function isIosDevice() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent);
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

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

  const existing = window.localStorage.getItem(deviceIdStorageKey);

  if (existing) return existing;

  const created = `device-${crypto.randomUUID()}`;
  window.localStorage.setItem(deviceIdStorageKey, created);
  return created;
}

async function saveTokenToProfile(token: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You need to log in before enabling notifications.");
  }

  const userRef = doc(db, "users", currentUser.uid);
  const deviceId = getDeviceId();
  const nextTokenMap: NotificationTokenMap = {
    [deviceId]: token,
  };
  const nextTokens = [token];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(pushTokenStorageKey, token);
  }

  await setDoc(userRef, {
    notificationTokenMap: nextTokenMap,
    notificationTokens: nextTokens,
    notificationsEnabled: true,
    notificationsUpdatedAt: new Date(),
    notificationDeviceId: deviceId,
  }, { merge: true });
}

async function removeTokenFromProfile(token: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You need to log in before disabling notifications.");
  }

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);
  const existingTokenMap = userSnap.exists()
    ? ((userSnap.data().notificationTokenMap as NotificationTokenMap | undefined) ?? {})
    : {};
  const deviceId = getDeviceId();
  const nextTokenMap = { ...existingTokenMap };
  delete nextTokenMap[deviceId];
  const nextTokens = Array.from(new Set(Object.values(nextTokenMap).filter((existingToken) => existingToken !== token)));

  await setDoc(userRef, {
    notificationTokenMap: nextTokenMap,
    notificationTokens: nextTokens,
    notificationsEnabled: nextTokens.length > 0,
    notificationsUpdatedAt: new Date(),
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

  if (isIosDevice() && !isStandaloneDisplayMode()) {
    throw new Error("On iPhone, add this site to your Home Screen in Safari and open it from that icon before enabling notifications.");
  }

  const vapidKey = getVapidKey();

  if (!vapidKey) {
    throw new Error("Missing push notification VAPID key.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    updateViaCache: "none",
  });
  await registration.update();
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

export async function disablePushNotifications() {
  if (typeof window === "undefined") {
    throw new Error("Notifications are only available in the browser.");
  }

  const vapidKey = getVapidKey();
  const messaging = await getMessagingInstance();

  if (!messaging || !vapidKey) {
    throw new Error("This device does not support web push.");
  }

  const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  }).catch(() => null);

  if (token) {
    await removeTokenFromProfile(token);
    await deleteToken(messaging).catch(() => undefined);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(pushTokenStorageKey);
    }
  } else {
    const currentUser = auth.currentUser;

    if (currentUser) {
      await setDoc(doc(db, "users", currentUser.uid), {
        notificationsEnabled: false,
        notificationsUpdatedAt: new Date(),
      }, { merge: true });
    }
  }
}

export async function attachForegroundNotificationListener(onForegroundNotification?: (payload: { title: string; body: string }) => void) {
  const messaging = await getMessagingInstance();

  if (!messaging) {
    return () => undefined;
  }

  return onMessage(messaging, (payload) => {
    const title = payload.data?.title || payload.notification?.title || "Defender One";
    const body = payload.data?.body || payload.notification?.body || "You have a new update.";

    onForegroundNotification?.({ title, body });
  });
}
