"use client"

import { getToken, onMessage } from "firebase/messaging"
import { useEffect } from "react"

import { browserMessaging } from "@/lib/firebase-client"

function capacitorBridge(): any | null {
  if (typeof window === "undefined") return null
  return (window as any).Capacitor || null
}

function nativePlugin(name: string): any | null {
  const capacitor = capacitorBridge()

  if (
    !capacitor ||
    capacitor?.isNativePlatform?.() !== true ||
    capacitor?.getPlatform?.() !== "android" ||
    capacitor?.isPluginAvailable?.(name) !== true
  ) {
    return null
  }

  return capacitor?.Plugins?.[name] || null
}

function openWalletIQRoute(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return
  window.location.assign(value)
}

export default function PushRuntime() {
  useEffect(() => {
    const nativePush = nativePlugin("PushNotifications")

    /* ========================================
       NATIVE ANDROID RUNTIME
    ======================================== */

    if (nativePush) {
      const localNotifications = nativePlugin("LocalNotifications")
      let pushReceivedListener: any
      let pushActionListener: any
      let localActionListener: any
      let cancelled = false

      ;(async () => {
        try {
          if (localNotifications) {
            await localNotifications.createChannel({
              id: "walletiq-default",
              name: "WalletIQ Notifications",
              description: "WalletIQ financial reminders and alerts",
              importance: 5,
              visibility: 1,
              sound: "default",
            })
          }

          pushReceivedListener = await nativePush.addListener(
            "pushNotificationReceived",
            async (notification: any) => {
              if (cancelled) return

              const title =
                notification?.title ||
                notification?.data?.title ||
                "WalletIQ"

              const body =
                notification?.body ||
                notification?.data?.body ||
                "You have a new notification."

              const url =
                notification?.data?.url ||
                "/dashboard"

              /*
                Android does not automatically display a remote
                notification banner while the app is foregrounded.
                Mirror that push as exactly one local notification.
              */
              if (!localNotifications) return

              try {
                let permission =
                  await localNotifications.checkPermissions()

                if (permission?.display !== "granted") {
                  permission =
                    await localNotifications.requestPermissions()
                }

                if (permission?.display !== "granted") return

                await localNotifications.schedule({
                  notifications: [
                    {
                      id:
                        Math.floor(Date.now() % 2147483000) + 1,
                      title,
                      body,
                      channelId: "walletiq-default",
                      extra: { url },
                    },
                  ],
                })
              } catch (error) {
                console.error(
                  "WalletIQ foreground notification error:",
                  error
                )
              }
            }
          )

          pushActionListener = await nativePush.addListener(
            "pushNotificationActionPerformed",
            (action: any) => {
              openWalletIQRoute(
                action?.notification?.data?.url
              )
            }
          )

          if (localNotifications) {
            localActionListener =
              await localNotifications.addListener(
                "localNotificationActionPerformed",
                (action: any) => {
                  openWalletIQRoute(
                    action?.notification?.extra?.url
                  )
                }
              )
          }
        } catch (error) {
          console.error("WalletIQ native push runtime error:", error)
        }
      })()

      return () => {
        cancelled = true
        void pushReceivedListener?.remove?.()
        void pushActionListener?.remove?.()
        void localActionListener?.remove?.()
      }
    }

    /* ========================================
       WEB / PWA FOREGROUND RUNTIME
    ======================================== */

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      const messaging = await browserMessaging()
      if (!messaging || cancelled) return

      /*
        Refresh/register the current browser token on every signed-in
        WalletIQ app-shell load. The subscription endpoint removes stale
        web tokens for this user, which prevents old Chrome registrations
        from receiving the same push twice.
      */
      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        "serviceWorker" in navigator
      ) {
        try {
          const registration =
            await navigator.serviceWorker.register(
              "/firebase-messaging-sw.js"
            )

          const token = await getToken(messaging, {
            vapidKey:
              process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          })

          if (token && !cancelled) {
            await fetch("/api/push/subscription", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token,
                userAgent: navigator.userAgent,
              }),
            })
          }
        } catch (error) {
          console.error(
            "WalletIQ browser push refresh error:",
            error
          )
        }
      }

      if (cancelled) return

      unsubscribe = onMessage(
        messaging,
        async (payload) => {
          const title =
            payload.data?.title ||
            payload.notification?.title ||
            "WalletIQ"

          const body =
            payload.data?.body ||
            payload.notification?.body ||
            "You have a new notification."

          const url =
            payload.data?.url ||
            "/dashboard"

          if (
            !("Notification" in window) ||
            Notification.permission !== "granted" ||
            !("serviceWorker" in navigator)
          ) {
            return
          }

          try {
            const registration =
              await navigator.serviceWorker.ready

            await registration.showNotification(title, {
              body,
              icon: "/icon.png",
              badge: "/icon.png",
              data: { url },
              tag:
                payload.messageId ||
                `walletiq-${Date.now()}`,
            })
          } catch (error) {
            console.error(
              "WalletIQ web foreground notification error:",
              error
            )
          }
        }
      )
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return null
}
