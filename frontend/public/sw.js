/* KingCoin Web Push service worker */
self.addEventListener("push", (event) => {
  let data = { title: "KingCoin", body: "", deeplink: "/notifications" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "KingCoin", {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { deeplink: data.deeplink || "/notifications" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const deeplink =
    event.notification?.data?.deeplink || "/notifications";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(deeplink);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(deeplink);
        }
      })
  );
});
