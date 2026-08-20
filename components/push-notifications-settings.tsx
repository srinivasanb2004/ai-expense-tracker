"use client"

import {
  BellRing,
  Send,
  Smartphone,
} from "lucide-react"

import {
  deleteToken,
  getToken,
  onMessage,
} from "firebase/messaging"

import {
  useEffect,
  useState,
} from "react"

import { browserMessaging } from "@/lib/firebase-client"

type Prefs = {
  enabled: boolean
  recurring: boolean
  borrowLend: boolean
  budgets: boolean
  overdue: boolean
}

const defaults: Prefs = {
  enabled: false,
  recurring: true,
  borrowLend: true,
  budgets: true,
  overdue: true,
}

export default function PushNotificationsSettings() {
  const [prefs, setPrefs] =
    useState<Prefs>(defaults)

  const [supported, setSupported] =
    useState(true)

  const [busy, setBusy] =
    useState(false)

  const [message, setMessage] =
    useState("")

  /* ========================================
     LOAD SETTINGS + FOREGROUND NOTIFICATIONS
  ======================================== */

  useEffect(() => {
    fetch("/api/push/preferences")
      .then((response) =>
        response.ok
          ? response.json()
          : defaults
      )
      .then(setPrefs)
      .catch(() => {})

    let unsubscribe:
      | (() => void)
      | undefined

    ;(async () => {
      const messaging =
        await browserMessaging()

      if (!messaging) {
        setSupported(false)
        return
      }

      unsubscribe = onMessage(
        messaging,
        async (payload) => {
          console.log(
            "WalletIQ foreground notification:",
            payload
          )

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

          /* Show message inside Settings */

          setMessage(
            `${title}: ${body}`
          )

          /* Show real browser / OS notification */

          if (
            Notification.permission ===
            "granted"
          ) {
            try {
              const registration =
                await navigator
                  .serviceWorker.ready

              await registration.showNotification(
                title,
                {
                  body,

                  icon: "/icon.png",

                  badge: "/icon.png",

                  data: {
                    url,
                  },

                  tag:
                    payload.messageId ||
                    `walletiq-${Date.now()}`,
                }
              )
            } catch (error) {
              console.error(
                "WalletIQ foreground notification error:",
                error
              )
            }
          }
        }
      )
    })()

    return () => {
      unsubscribe?.()
    }
  }, [])

  /* ========================================
     SAVE PREFERENCES
  ======================================== */

  async function save(next: Prefs) {
    setPrefs(next)

    try {
      const response =
        await fetch(
          "/api/push/preferences",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(next),
          }
        )

      if (!response.ok) {
        throw new Error(
          "Could not save notification preferences."
        )
      }
    } catch (error) {
      console.error(
        "Push preference error:",
        error
      )
    }
  }

  /* ========================================
     ENABLE PUSH
  ======================================== */

  async function enable() {
    setBusy(true)
    setMessage("")

    try {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
      ) {
        throw new Error(
          "Push notifications are not supported in this browser."
        )
      }

      const permission =
        await Notification.requestPermission()

      if (permission !== "granted") {
        throw new Error(
          "Notification permission was not granted."
        )
      }

      /* Register Firebase service worker */

      const registration =
        await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        )

      /* Get Firebase Messaging */

      const messaging =
        await browserMessaging()

      if (!messaging) {
        throw new Error(
          "Firebase Messaging is not supported in this browser."
        )
      }

      /* Create FCM device token */

      const token =
        await getToken(
          messaging,
          {
            vapidKey:
              process.env
                .NEXT_PUBLIC_FIREBASE_VAPID_KEY,

            serviceWorkerRegistration:
              registration,
          }
        )

      if (!token) {
        throw new Error(
          "Could not create a push token."
        )
      }

      /* Save device token in WalletIQ */

      const response =
        await fetch(
          "/api/push/subscription",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              token,
              userAgent:
                navigator.userAgent,
            }),
          }
        )

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}))

        throw new Error(
          data.error ||
            "Could not save this device."
        )
      }

      await save({
        ...prefs,
        enabled: true,
      })

      setMessage(
        "Push notifications enabled on this device."
      )
    } catch (error: any) {
      console.error(
        "Enable push error:",
        error
      )

      setMessage(
        error?.message ||
          "Could not enable push notifications."
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     DISABLE PUSH
  ======================================== */

  async function disable() {
    setBusy(true)
    setMessage("")

    try {
      const messaging =
        await browserMessaging()

      if (messaging) {
        const registration =
          await navigator
            .serviceWorker.ready
            .catch(() => undefined)

        const token =
          await getToken(
            messaging,
            {
              vapidKey:
                process.env
                  .NEXT_PUBLIC_FIREBASE_VAPID_KEY,

              ...(registration
                ? {
                    serviceWorkerRegistration:
                      registration,
                  }
                : {}),
            }
          ).catch(() => null)

        if (token) {
          await fetch(
            "/api/push/subscription",
            {
              method: "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                token,
              }),
            }
          )
        }

        await deleteToken(
          messaging
        ).catch(() => false)
      }

      await save({
        ...prefs,
        enabled: false,
      })

      setMessage(
        "Push notifications disabled on this device."
      )
    } catch (error) {
      console.error(
        "Disable push error:",
        error
      )

      setMessage(
        "Could not disable push notifications."
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     SEND TEST
  ======================================== */

  async function test() {
    setBusy(true)
    setMessage("")

    try {
      const response =
        await fetch(
          "/api/push/test",
          {
            method: "POST",
          }
        )

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Test notification failed."
        )
      }

      setMessage(
        "Test notification sent. Check your device."
      )
    } catch (error: any) {
      console.error(
        "Test notification error:",
        error
      )

      setMessage(
        error?.message ||
          "Test notification failed."
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     TOGGLE PREFERENCE
  ======================================== */

  function toggle(
    key: keyof Omit<
      Prefs,
      "enabled"
    >
  ) {
    void save({
      ...prefs,
      [key]: !prefs[key],
    })
  }

  return (
    <div className="soft-panel mt-8">
      {/* HEADER */}

      <div className="flex items-start gap-4">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
          style={{
            borderColor:
              "var(--line)",

            background:
              "var(--secondary)",
          }}
        >
          <BellRing
            size={19}
            className="accent"
          />
        </div>

        <div className="flex-1">
          <h3 className="font-black">
            Push notifications
          </h3>

          <p className="mt-1 text-sm muted">
            Get WalletIQ reminders even
            when the app is not open.
          </p>
        </div>
      </div>

      {/* NOT SUPPORTED */}

      {!supported ? (
        <p
          className="mt-5 rounded-xl border p-3 text-sm muted"
          style={{
            borderColor:
              "var(--line)",
          }}
        >
          Push notifications are not
          supported by this
          browser/device.
        </p>
      ) : (
        <>
          {/* ACTION BUTTONS */}

          <div className="mt-5 flex flex-wrap gap-2">
            {prefs.enabled ? (
              <button
                type="button"
                disabled={busy}
                onClick={disable}
                className="btn btn-secondary"
              >
                Disable on this device
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={enable}
                className="btn btn-primary"
              >
                <Smartphone
                  size={17}
                />

                {busy
                  ? "Enabling..."
                  : "Enable notifications"}
              </button>
            )}

            <button
              type="button"
              disabled={
                busy ||
                !prefs.enabled
              }
              onClick={test}
              className="btn btn-secondary"
            >
              <Send size={16} />
              Send test
            </button>
          </div>

          {/* PREFERENCES */}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(
              [
                [
                  "recurring",
                  "Recurring payment reminders",
                ],

                [
                  "borrowLend",
                  "Borrow & Lend reminders",
                ],

                [
                  "budgets",
                  "Budget warnings",
                ],

                [
                  "overdue",
                  "Overdue alerts",
                ],
              ] as const
            ).map(
              ([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-bold"
                  style={{
                    borderColor:
                      "var(--line)",

                    background:
                      "var(--secondary)",
                  }}
                >
                  <span>
                    {label}
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      prefs[key]
                    }
                    onChange={() =>
                      toggle(key)
                    }
                    disabled={
                      !prefs.enabled
                    }
                  />
                </label>
              )
            )}
          </div>
        </>
      )}

      {/* STATUS */}

      {message && (
        <p className="mt-4 text-xs muted">
          {message}
        </p>
      )}
    </div>
  )
}