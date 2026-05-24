export async function registerKingCoinServiceWorker(): Promise<
  ServiceWorkerRegistration | null
> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function subscribeWebPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  const reg = await registerKingCoinServiceWorker();
  if (!reg?.pushManager) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const key = urlBase64ToUint8Array(vapidPublicKey);
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}
