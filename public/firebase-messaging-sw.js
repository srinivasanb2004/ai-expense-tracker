/* WalletIQ Firebase Messaging service worker */
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyAIunqsf1ZqYNJyYlAu36g34_McphoMHVk",
  authDomain: "walletiq-a8ee1.firebaseapp.com",
  projectId: "walletiq-a8ee1",
  storageBucket: "walletiq-a8ee1.firebasestorage.app",
  messagingSenderId: "792020894088",
  appId: "1:792020894088:web:7cf333e835018d181c7a3d",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  /*
    Notification payloads are displayed automatically by FCM while the
    web app is in the background. Showing them again here creates a
    duplicate browser notification. Keep this handler only as a fallback
    for any legacy/data-only WalletIQ messages.
  */
  if (payload.notification) return

  self.registration.showNotification(
    payload.data?.title || "WalletIQ",
    {
      body:
        payload.data?.body ||
        "You have a new reminder.",
      icon: "/icon.png",
      badge: "/icon.png",
      data: {
        url: payload.data?.url || "/dashboard",
      },
    }
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url =
    event.notification.data?.url ||
    "/dashboard"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windows) => {
        for (const client of windows) {
          if ("focus" in client) {
            client.navigate(url)
            return client.focus()
          }
        }

        return clients.openWindow(url)
      })
  )
})
