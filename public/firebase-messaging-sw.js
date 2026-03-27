importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config is provided via a query string when registering the SW
// e.g. navigator.serviceWorker.register('/firebase-messaging-sw.js?config=<base64>')
const url = new URL(location.href);
const configParam = url.searchParams.get("config");
if (configParam) {
  try {
    const config = JSON.parse(atob(configParam));
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification ?? {};
      self.registration.showNotification(title ?? "Glam Delivery", {
        body: body ?? "",
        icon: "/logo.png",
      });
    });
  } catch {
    // ignore
  }
}
