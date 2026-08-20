"use client"

import AppShell from "@/components/app-shell"
import PushNotificationsSettings from "@/components/push-notifications-settings"
import Toast, { ToastState } from "@/components/toast"

import {
  AlertTriangle,
  Database,
  Download,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react"

import { useEffect, useState } from "react"
import { signOut, useSession } from "next-auth/react"
type Profile = {
  name: string | null
  email: string
  createdAt: string
}

export default function Settings() {
  const { update } = useSession()

  const [theme, setTheme] =
    useState<"dark" | "light">("dark")

  const [confirm, setConfirm] =
    useState(false)

  const [busy, setBusy] =
    useState(false)

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [name, setName] =
    useState("")

  const [toast, setToast] =
    useState<ToastState>(null)

  function say(
    message: string,
    type: "success" | "error" = "success"
  ) {
    setToast({
      message,
      type,
    })

    setTimeout(() => {
      setToast(null)
    }, 2600)
  }

  useEffect(() => {
    const savedTheme =
      (localStorage.getItem("theme") as
        | "dark"
        | "light") || "dark"

    setTheme(savedTheme)

    document.documentElement.classList.remove(
      "dark",
      "light"
    )

    document.documentElement.classList.add(
      savedTheme
    )

    async function loadProfile() {
      try {
        const response =
          await fetch("/api/profile")

        if (!response.ok) {
          return
        }

        const data =
          await response.json()

        if (data?.email) {
          setProfile(data)
          setName(data.name || "")
        }
      } catch (error) {
        console.error(
          "Load profile error:",
          error
        )
      }
    }

    loadProfile()
  }, [])

  function toggleTheme() {
    const newTheme =
      theme === "dark"
        ? "light"
        : "dark"

    setTheme(newTheme)

    localStorage.setItem(
      "theme",
      newTheme
    )

    document.documentElement.classList.remove(
      "dark",
      "light"
    )

    document.documentElement.classList.add(
      newTheme
    )
  }

  async function saveProfile(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!name.trim()) {
      say(
        "Display name is required.",
        "error"
      )
      return
    }

    setBusy(true)

    try {
      const response = await fetch(
        "/api/profile",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
          }),
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        say(
          data.error ||
          "Could not update profile",
          "error"
        )
        return
      }

      setProfile(data)
      setName(data.name || "")

      // Update Auth.js JWT/session name
      await update({
        name: data.name,
      })

      say(
        "Display name updated successfully"
      )
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      )

      say(
        "Could not update profile",
        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  async function clearAllData() {
    setBusy(true)

    try {
      const response = await fetch(
        "/api/settings/clear-data",
        {
          method: "DELETE",
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        say(
          data.error ||
          "Could not clear data",
          "error"
        )
        return
      }

      setConfirm(false)

      say(
        "All financial data cleared"
      )
    } catch (error) {
      console.error(
        "Clear data error:",
        error
      )

      say(
        "Could not clear data",
        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  const initial = (
    profile?.name ||
    profile?.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase()

  return (
    <AppShell>
      <Toast
        toast={toast}
        onClose={() =>
          setToast(null)
        }
      />

      <p className="eyebrow">
        Workspace
      </p>

      <h2 className="mt-2 text-3xl font-black">
        Settings
      </h2>

      <p className="mt-2 muted">
        Profile, privacy, appearance and
        data controls.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <div className="soft-panel lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-300 text-2xl font-black text-emerald-950">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <UserRound
                  className="accent"
                  size={18}
                />

                <h3 className="font-black">
                  Your profile
                </h3>
              </div>

              <p className="mt-1 truncate text-sm muted">
                {profile?.email ||
                  "Loading profile..."}
              </p>

              {profile && (
                <p className="mt-1 text-xs muted">
                  Account created{" "}
                  {new Date(
                    profile.createdAt
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={saveProfile}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              className="input"
              placeholder="Display name"
              required
            />

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary sm:w-48"
            >
              {busy
                ? "Saving..."
                : "Save name"}
            </button>
          </form>
        </div>

        {/* Privacy */}
        <div className="soft-panel">
          <ShieldCheck className="accent" />

          <h3 className="mt-4 font-black">
            Privacy
          </h3>

          <p className="mt-2 text-sm leading-6 muted">
            Your financial records are
            scoped to your authenticated
            user account.
          </p>
        </div>

        {/* Export */}
        <div className="soft-panel">
          <Database className="accent" />

          <h3 className="mt-4 font-black">
            Export your data
          </h3>

          <p className="mt-2 text-sm muted">
            Download expense
            transactions as CSV.
          </p>

          <a
            href="/api/export"
            className="btn btn-secondary mt-4"
          >
            <Download size={17} />
            Download CSV
          </a>
        </div>

        {/* Appearance */}
        <div className="soft-panel lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              {theme === "dark" ? (
                <Moon className="accent" />
              ) : (
                <Sun className="accent" />
              )}

              <h3 className="mt-4 font-black">
                Appearance
              </h3>

              <p className="mt-2 text-sm muted">
                Switch between dark and
                light mode.
              </p>
            </div>

            <button
              type="button"
              onClick={
                toggleTheme
              }
              aria-label="Toggle theme"
              className={`relative h-8 w-16 rounded-full p-1 transition ${theme === "light"
                ? "bg-emerald-300"
                : "bg-white/10"
                }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-emerald-950 transition-transform ${theme === "light"
                  ? "translate-x-8"
                  : ""
                  }`}
              />
            </button>
          </div>

          <p className="mt-4 text-xs muted">
            Current theme:{" "}
            <span className="font-bold accent">
              {theme === "dark"
                ? "Dark"
                : "Light"}
            </span>
          </p>
        </div>
      </div>


      {/* Device push notifications */}
      <PushNotificationsSettings />

      {/* Account / Logout */}
      <div className="soft-panel mt-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
              style={{
                borderColor: "var(--line)",
                background: "var(--secondary)",
              }}
            >
              <LogOut
                size={19}
                className="accent"
              />
            </div>

            <div>
              <h3 className="font-black">
                Account
              </h3>

              <p className="mt-1 text-sm muted">
                Signed in as{" "}
                <span className="font-bold">
                  {profile?.email || "your account"}
                </span>
              </p>

              <p className="mt-1 text-xs muted">
                Log out securely from WalletIQ on this device.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await signOut({
                redirect: false,
              })

              window.location.href = "/"
            }}
            className="btn btn-secondary cursor-pointer whitespace-nowrap"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-panel mt-8">
        <div className="flex gap-4">
          <Trash2 className="shrink-0 text-red-400" />

          <div>
            <h3 className="font-black text-red-300">
              Danger Zone
            </h3>

            <p className="mt-2 text-sm muted">
              Delete all financial
              records while keeping your
              login account.
            </p>

            <button
              type="button"
              onClick={() =>
                setConfirm(true)
              }
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
            >
              Clear all data
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="modal-panel w-full max-w-md rounded-3xl border p-6">
            <div className="flex justify-between">
              <AlertTriangle className="text-red-400" />

              <button
                type="button"
                onClick={() =>
                  setConfirm(false)
                }
                disabled={busy}
              >
                <X />
              </button>
            </div>

            <h3 className="mt-5 text-xl font-black">
              Clear all data?
            </h3>

            <p className="mt-3 text-sm leading-6 muted">
              This permanently deletes
              your financial data and
              cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setConfirm(false)
                }
                disabled={busy}
                className="btn btn-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  clearAllData
                }
                disabled={busy}
                className="rounded-xl bg-red-500 px-4 py-2 font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {busy
                  ? "Clearing..."
                  : "Clear everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}