importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCTUp_5yMhoIp2UINVkQ0vpnd4ruT5cE8M",
  authDomain: "ride-app-dd741.firebaseapp.com",
  projectId: "ride-app-dd741",
  storageBucket: "ride-app-dd741.firebasestorage.app",
  messagingSenderId: "687926260250",
  appId: "1:687926260250:web:d5a5c90b35a7e70ae017a3",
  measurementId: "G-FFJ93JGYHP",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Squadron Rides";
  const body = payload.notification?.body || "You have a new ride update.";
  const link = payload.data?.link || "/";

  self.registration.showNotification(title, {
    body,
    icon: "/window.svg",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.link || "/", self.location.origin).toString();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(target);
      }

      return undefined;
    })
  );
});
