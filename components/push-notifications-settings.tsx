"use client"

import {
  BellRing,
  Send,
  Smartphone,
} from "lucide-react"

import {
  deleteToken,
  getToken,
} from "firebase/messaging"

import {
  useEffect,
  useState,
} from "react"

import { browserMessaging } from "@/lib/firebase-client"

type Prefs = {
  recurring: boolean
  borrowLend: boolean
  budgets: boolean
  overdue: boolean
}

const defaults: Prefs = {
  recurring: true,
  borrowLend: true,
  budgets: true,
  overdue: true,
}

/* ========================================
   NATIVE CAPACITOR HELPERS
======================================== */

function getNativePushPlugin(): any | null {
  if (typeof window === "undefined") {
    return null
  }

  const capacitor =
    (window as any).Capacitor

  if (
    !capacitor ||
    capacitor?.isNativePlatform?.() !== true ||
    capacitor?.getPlatform?.() !== "android"
  ) {
    return null
  }

  if (
    capacitor?.isPluginAvailable?.(
      "PushNotifications"
    ) !== true
  ) {
    return null
  }

  return (
    capacitor?.Plugins
      ?.PushNotifications || null
  )
}

function isNativeAndroid() {
  return getNativePushPlugin() !== null
}

/* ========================================
   GET NATIVE FCM TOKEN
======================================== */

async function getNativeToken(): Promise<
  string | null
> {
  const push =
    getNativePushPlugin()

  if (!push) {
    return null
  }

  return new Promise<string | null>(
    async (resolve) => {
      let finished = false
      let registrationListener: any
      let errorListener: any
      let timeout:
        | ReturnType<
          typeof setTimeout
        >
        | undefined

      const cleanup =
        async () => {
          if (timeout) {
            clearTimeout(timeout)
          }

          try {
            await registrationListener
              ?.remove?.()
          } catch { }

          try {
            await errorListener
              ?.remove?.()
          } catch { }
        }

      const finish =
        async (
          value: string | null
        ) => {
          if (finished) {
            return
          }

          finished = true

          await cleanup()

          resolve(value)
        }

      try {
        registrationListener =
          await push.addListener(
            "registration",
            (token: any) => {
              void finish(
                token?.value ||
                null
              )
            }
          )

        errorListener =
          await push.addListener(
            "registrationError",
            (error: any) => {
              console.error(
                "Native push registration error:",
                error
              )

              void finish(null)
            }
          )

        timeout =
          setTimeout(
            () => {
              void finish(null)
            },
            10000
          )

        await push.register()
      } catch (error) {
        console.error(
          "Native push register error:",
          error
        )

        await finish(null)
      }
    }
  )
}

/* ========================================
   COMPONENT
======================================== */

export default function PushNotificationsSettings() {
  const [prefs, setPrefs] =
    useState<Prefs>(defaults)

  const [
    deviceEnabled,
    setDeviceEnabled,
  ] = useState(false)

  const [
    checkingDevice,
    setCheckingDevice,
  ] = useState(true)

  const [
    supported,
    setSupported,
  ] = useState(true)

  const [busy, setBusy] =
    useState(false)

  const [
    message,
    setMessage,
  ] = useState("")

  /* ========================================
     LOAD ACCOUNT PREFERENCES
  ======================================== */

  useEffect(() => {
    async function loadPreferences() {
      try {
        const response =
          await fetch(
            "/api/push/preferences",
            {
              cache:
                "no-store",
            }
          )

        if (!response.ok) {
          return
        }

        const data =
          await response.json()

        setPrefs({
          recurring:
            data.recurring !==
            false,

          borrowLend:
            data.borrowLend !==
            false,

          budgets:
            data.budgets !==
            false,

          overdue:
            data.overdue !==
            false,
        })
      } catch (error) {
        console.error(
          "Load push preferences error:",
          error
        )
      }
    }

    void loadPreferences()
  }, [])

  /* ========================================
     CHECK CURRENT DEVICE
  ======================================== */

  useEffect(() => {
    let cancelled = false

    async function checkCurrentDevice() {
      setCheckingDevice(true)

      try {
        /* ==============================
           NATIVE ANDROID
        ============================== */

        const nativePush =
          getNativePushPlugin()

        if (nativePush) {
          if (!cancelled) {
            setSupported(true)
          }

          /*
            Create Android notification channel.
        
            Android 8+ uses notification channels
            to control sound, priority and visibility.
          */
          await nativePush.createChannel({
            id: "walletiq-default",
            name: "WalletIQ Notifications",
            description:
              "WalletIQ financial reminders and alerts",
            importance: 5,
            visibility: 1,
            sound: "default",
          })

          const permission =
            await nativePush
              .checkPermissions()

          if (
            permission?.receive !==
            "granted"
          ) {
            if (!cancelled) {
              setDeviceEnabled(
                false
              )
            }

            return
          }

          const token =
            await getNativeToken()

          if (!token) {
            if (!cancelled) {
              setDeviceEnabled(
                false
              )
            }

            return
          }
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
                    `WalletIQ Android | ${navigator.userAgent}`,
                }),
              }
            )

          if (!cancelled) {
            setDeviceEnabled(response.ok)
          }

          return
        }

        /* ==============================
           WEB / PWA
        ============================== */

        if (
          !(
            "Notification" in
            window
          ) ||
          !(
            "serviceWorker" in
            navigator
          )
        ) {
          if (!cancelled) {
            setSupported(false)
            setDeviceEnabled(
              false
            )
          }

          return
        }

        if (
          Notification.permission !==
          "granted"
        ) {
          if (!cancelled) {
            setSupported(true)
            setDeviceEnabled(
              false
            )
          }

          return
        }

        const messaging =
          await browserMessaging()

        if (!messaging) {
          if (!cancelled) {
            setSupported(false)
            setDeviceEnabled(
              false
            )
          }

          return
        }

        const registration =
          await navigator
            .serviceWorker
            .register(
              "/firebase-messaging-sw.js"
            )

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
          ).catch(
            () => null
          )

        if (!token) {
          if (!cancelled) {
            setDeviceEnabled(
              false
            )
          }

          return
        }
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

        if (!cancelled) {
          setDeviceEnabled(response.ok)
        }
      } catch (error) {
        console.error(
          "Check push device error:",
          error
        )

        if (!cancelled) {
          setDeviceEnabled(false)
        }
      } finally {
        if (!cancelled) {
          setCheckingDevice(
            false
          )
        }
      }
    }

    void checkCurrentDevice()

    return () => {
      cancelled = true
    }
  }, [])


  /* ========================================
     SAVE PREFERENCES
  ======================================== */

  async function savePreferences(
    next: Prefs
  ) {
    const previous = prefs

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

            body:
              JSON.stringify(
                next
              ),
          }
        )

      if (!response.ok) {
        throw new Error(
          "Could not save notification preferences."
        )
      }
    } catch (error) {
      setPrefs(previous)

      console.error(
        "Push preference error:",
        error
      )

      setMessage(
        "Could not save notification preferences."
      )
    }
  }

  /* ========================================
     ENABLE THIS DEVICE
  ======================================== */

  async function enable() {
    setBusy(true)
    setMessage("")

    try {
      const nativePush =
        getNativePushPlugin()

      /* ==============================
         NATIVE ANDROID
      ============================== */

      if (nativePush) {
        let permission =
          await nativePush
            .checkPermissions()

        if (
          permission?.receive !==
          "granted"
        ) {
          permission =
            await nativePush
              .requestPermissions()
        }

        if (
          permission?.receive !==
          "granted"
        ) {
          throw new Error(
            "Notification permission was not granted."
          )
        }

        const token =
          await getNativeToken()

        if (!token) {
          throw new Error(
            "Could not create an Android push token."
          )
        }

        const response =
          await fetch(
            "/api/push/subscription",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  token,

                  userAgent:
                    `WalletIQ Android | ${navigator.userAgent}`,
                }),
            }
          )

        const data =
          await response
            .json()
            .catch(
              () => ({})
            )

        if (!response.ok) {
          throw new Error(
            data.error ||
            "Could not save this Android device."
          )
        }

        setSupported(true)

        setDeviceEnabled(
          true
        )

        setMessage(
          "Push notifications enabled on this Android device."
        )

        return
      }

      /* ==============================
         WEB / PWA
      ============================== */

      if (
        !(
          "Notification" in
          window
        ) ||
        !(
          "serviceWorker" in
          navigator
        )
      ) {
        throw new Error(
          "Push notifications are not supported in this browser."
        )
      }

      const permission =
        await Notification
          .requestPermission()

      if (
        permission !==
        "granted"
      ) {
        throw new Error(
          "Notification permission was not granted."
        )
      }

      const registration =
        await navigator
          .serviceWorker
          .register(
            "/firebase-messaging-sw.js"
          )

      const messaging =
        await browserMessaging()

      if (!messaging) {
        throw new Error(
          "Firebase Messaging is not supported in this browser."
        )
      }

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

      const response =
        await fetch(
          "/api/push/subscription",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,

                userAgent:
                  navigator
                    .userAgent,
              }),
          }
        )

      const data =
        await response
          .json()
          .catch(
            () => ({})
          )

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Could not save this device."
        )
      }

      setSupported(true)

      setDeviceEnabled(true)

      setMessage(
        "Push notifications enabled on this device."
      )
    } catch (error) {
      console.error(
        "Enable push error:",
        error
      )

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not enable push notifications."
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     DISABLE THIS DEVICE
  ======================================== */

  async function disable() {
    setBusy(true)
    setMessage("")

    try {
      const nativePush =
        getNativePushPlugin()

      /* ==============================
         NATIVE ANDROID
      ============================== */

      if (nativePush) {
        const token =
          await getNativeToken()

        if (!token) {
          throw new Error(
            "Could not identify this Android device."
          )
        }

        const response =
          await fetch(
            "/api/push/subscription",
            {
              method: "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  token,
                }),
            }
          )

        const data =
          await response
            .json()
            .catch(
              () => ({})
            )

        if (!response.ok) {
          throw new Error(
            data.error ||
            "Could not remove this Android device."
          )
        }

        setDeviceEnabled(false)

        setMessage(
          "Push notifications disabled on this Android device."
        )

        return
      }

      /* ==============================
         WEB / PWA
      ============================== */

      const messaging =
        await browserMessaging()

      if (messaging) {
        const registration =
          await navigator
            .serviceWorker
            .ready
            .catch(
              () => undefined
            )

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
          ).catch(
            () => null
          )

        if (token) {
          const response =
            await fetch(
              "/api/push/subscription",
              {
                method:
                  "DELETE",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    token,
                  }),
              }
            )

          if (!response.ok) {
            throw new Error(
              "Could not remove this device."
            )
          }
        }

        await deleteToken(
          messaging
        ).catch(
          () => false
        )
      }

      setDeviceEnabled(false)

      setMessage(
        "Push notifications disabled on this device."
      )
    } catch (error) {
      console.error(
        "Disable push error:",
        error
      )

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not disable push notifications on this device."
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
          .catch(
            () => ({})
          )

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Test notification failed."
        )
      }

      setMessage(
        "Test notification sent. Check your registered devices."
      )
    } catch (error) {
      console.error(
        "Test notification error:",
        error
      )

      setMessage(
        error instanceof Error
          ? error.message
          : "Test notification failed."
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     TOGGLE PREFERENCE
  ======================================== */

  function toggle(
    key: keyof Prefs
  ) {
    void savePreferences({
      ...prefs,

      [key]:
        !prefs[key],
    })
  }

  /* ========================================
     UI
  ======================================== */

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
            Get WalletIQ reminders
            even when the app is not
            open.
          </p>
        </div>
      </div>

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
          {/* CURRENT DEVICE */}

          <div
            className="mt-5 rounded-2xl border p-4"
            style={{
              borderColor:
                "var(--line)",

              background:
                "var(--secondary)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">
                  This device
                </p>

                <p className="mt-1 text-xs muted">
                  {checkingDevice
                    ? "Checking notification status..."
                    : deviceEnabled
                      ? isNativeAndroid()
                        ? "Push notifications are enabled on this Android device."
                        : "Push notifications are enabled on this browser."
                      : isNativeAndroid()
                        ? "Push notifications are not enabled on this Android device."
                        : "Push notifications are not enabled on this browser."}
                </p>
              </div>

              {!checkingDevice &&
                (deviceEnabled ? (
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black accent">
                    ENABLED
                  </span>
                ) : (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black muted">
                    DISABLED
                  </span>
                ))}
            </div>
          </div>

          {/* DEVICE ACTIONS */}

          <div className="mt-4 flex flex-wrap gap-2">
            {checkingDevice ? (
              <button
                type="button"
                disabled
                className="btn btn-secondary"
              >
                Checking...
              </button>
            ) : deviceEnabled ? (
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
                checkingDevice ||
                !deviceEnabled
              }
              onClick={test}
              className="btn btn-secondary"
            >
              <Send size={16} />
              Send test
            </button>
          </div>

          {/* PREFERENCES */}

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[.14em] muted">
              Notification preferences
            </p>

            <p className="mt-1 text-xs muted">
              These preferences are
              shared across all devices
              signed in to this account.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
              ([
                key,
                label,
              ]) => (
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
                  />
                </label>
              )
            )}
          </div>
        </>
      )}

      {message && (
        <p className="mt-4 text-xs muted">
          {message}
        </p>
      )}
    </div>
  )
}