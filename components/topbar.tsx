"use client"

import Link from "next/link"

import {
  Bell,
  Bot,
  RefreshCw,
  BarChart3,
  ScanLine,
  Settings,
  Moon,
  Sun,
  Calculator,
  Copy,
  Trash2,
} from "lucide-react"

import {
  useEffect,
  useRef,
  useState,
} from "react"

import Logo from "./logo"

type NotificationItem = {
  id: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export default function Topbar() {
  const [open, setOpen] =
    useState(false)

  const [items, setItems] =
    useState<NotificationItem[]>([])

  const [unread, setUnread] =
    useState(0)

  const [refreshing, setRefreshing] =
    useState(false)

  const [theme, setTheme] =
    useState<"dark" | "light">("dark")

  const [calculatorOpen, setCalculatorOpen] =
    useState(false)

  const [calculatorDisplay, setCalculatorDisplay] =
    useState("0")

  const [calculatorExpression, setCalculatorExpression] =
    useState("")

  const box =
    useRef<HTMLDivElement>(null)

  const calculatorBox =
    useRef<HTMLDivElement>(null)

  async function loadNotifications() {
    const response =
      await fetch(
        "/api/notifications",
        {
          cache: "no-store",
        }
      )

    if (!response.ok) {
      return
    }

    const data =
      await response.json()

    setItems(
      data.notifications || []
    )

    setUnread(
      data.unread || 0
    )
  }

  useEffect(() => {
    loadNotifications()

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

  async function refreshNotifications() {
    if (refreshing) return

    setRefreshing(true)

    try {
      await fetch(
        "/api/notifications",
        {
          method: "POST",
        }
      )

      await loadNotifications()
    } catch (error) {
      console.error(
        "Notification refresh error:",
        error
      )
    } finally {
      setRefreshing(false)
    }
  }

  async function toggleNotifications() {
    const nextOpen =
      !open

    setOpen(
      nextOpen
    )

    if (!nextOpen) {
      return
    }

    await refreshNotifications()
  }

  useEffect(() => {
    function close(
      event: MouseEvent
    ) {
      if (
        box.current &&
        !box.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false)
      }
    }

    document.addEventListener(
      "mousedown",
      close
    )

    return () =>
      document.removeEventListener(
        "mousedown",
        close
      )
  }, [])


  useEffect(() => {
    function closeCalculator(
      event: MouseEvent
    ) {
      if (
        calculatorBox.current &&
        !calculatorBox.current.contains(
          event.target as Node
        )
      ) {
        setCalculatorOpen(false)
      }
    }

    document.addEventListener(
      "mousedown",
      closeCalculator
    )

    return () =>
      document.removeEventListener(
        "mousedown",
        closeCalculator
      )
  }, [])

  async function markAllRead() {
    await fetch(
      "/api/notifications",
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({}),
      }
    )

    await loadNotifications()
  }

  async function markRead(
    id: string
  ) {
    await fetch(
      "/api/notifications",
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            id,
          }),
      }
    )

    await loadNotifications()
  }

  async function clearAllNotifications() {
    if (!items.length) return

    const response = await fetch(
      "/api/notifications",
      { method: "DELETE" }
    )

    if (!response.ok) {
      return
    }

    setItems([])
    setUnread(0)
  }


  function appendCalculator(value: string) {
    if (value === ".") {
      const parts = calculatorExpression.split(/[+\-*/]/)
      const currentPart = parts[parts.length - 1] || ""

      if (currentPart.includes(".")) {
        return
      }
    }

    const next =
      calculatorExpression === "0"
        ? value
        : `${calculatorExpression}${value}`

    setCalculatorExpression(next)
    setCalculatorDisplay(next || "0")
  }

  function clearCalculator() {
    setCalculatorExpression("")
    setCalculatorDisplay("0")
  }

  function backspaceCalculator() {
    const next =
      calculatorExpression.slice(0, -1)

    setCalculatorExpression(next)
    setCalculatorDisplay(next || "0")
  }

  function calculateResult() {
    if (!calculatorExpression.trim()) {
      return
    }

    try {
      const safeExpression =
        calculatorExpression.replace(/×/g, "*").replace(/÷/g, "/")

      if (!/^[0-9+\-*/.()\s]+$/.test(safeExpression)) {
        throw new Error("Invalid expression")
      }

      const result = Function(
        `"use strict"; return (${safeExpression})`
      )()

      if (
        typeof result !== "number" ||
        !Number.isFinite(result)
      ) {
        throw new Error("Invalid result")
      }

      const rounded =
        Math.round((result + Number.EPSILON) * 100000000) /
        100000000

      setCalculatorExpression(String(rounded))
      setCalculatorDisplay(String(rounded))
    } catch {
      setCalculatorExpression("")
      setCalculatorDisplay("Error")
    }
  }

  async function copyCalculatorResult() {
    try {
      await navigator.clipboard.writeText(
        calculatorDisplay
      )
    } catch (error) {
      console.error(
        "Could not copy calculator result:",
        error
      )
    }
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-[72px] w-full min-w-0 items-center justify-between gap-1.5 border-b px-2.5 backdrop-blur-xl sm:gap-2 sm:px-3 md:h-20 md:px-8"
      style={{
        background:
          "color-mix(in srgb, var(--bg) 88%, transparent)",

        borderColor:
          "var(--line)",

        color:
          "var(--text)",
      }}
    >
      {/* MOBILE LOGO */}

      <div className="min-w-0 flex-1 overflow-hidden md:hidden">
        <Logo subtitle="WalletIQ AI ✦" />
      </div>

      {/* DESKTOP TITLE */}

      <div className="hidden min-w-0 md:block">
        <p
          className="text-xs font-bold uppercase tracking-[0.18em]"
          style={{
            color:
              "var(--muted)",
          }}
        >
          WalletIQ AI • Finance workspace
        </p>

        <h1 className="mt-1 text-xl font-black">
          Your money, made clearer.
        </h1>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* DESKTOP: LIGHT/DARK -> AI -> AI SCAN */}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            theme === "dark"
              ? "Light mode"
              : "Dark mode"
          }
          className="hidden h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5 md:grid"
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary)",
            color: "var(--text)",
          }}
        >
          {theme === "dark" ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>

        {/* DESKTOP CALCULATOR */}

        <div
          ref={calculatorBox}
          className="relative hidden md:block"
        >
          <button
            type="button"
            onClick={() =>
              setCalculatorOpen(
                (current) => !current
              )
            }
            aria-label="Calculator"
            title="Calculator"
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5"
            style={{
              borderColor: "var(--line)",
              background: "var(--secondary)",
              color: "var(--text)",
            }}
          >
            <Calculator size={19} />
          </button>

          {calculatorOpen && (
            <div
              className="absolute right-0 top-14 z-50 w-[250px] rounded-2xl border p-3 shadow-2xl"
              style={{
                borderColor: "var(--line)",
                background: "var(--panel)",
                color: "var(--text)",
              }}
            >
              <div
                className="rounded-xl border p-2.5"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--secondary)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] muted">
                    Calculator
                  </p>

                  <button
                    type="button"
                    onClick={copyCalculatorResult}
                    className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/5"
                    aria-label="Copy result"
                    title="Copy result"
                  >
                    <Copy size={15} />
                  </button>
                </div>

                <p className="mt-2 min-h-7 break-all text-right text-xl font-black">
                  {calculatorDisplay}
                </p>
              </div>

              <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                {[
                  "7",
                  "8",
                  "9",
                  "÷",
                  "4",
                  "5",
                  "6",
                  "×",
                  "1",
                  "2",
                  "3",
                  "-",
                  "0",
                  ".",
                  "=",
                  "+",
                ].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === "=") {
                        calculateResult()
                      } else {
                        appendCalculator(key)
                      }
                    }}
                    className={`h-9 rounded-lg border text-xs font-black transition hover:-translate-y-0.5 ${
                      ["+", "-", "×", "÷", "="].includes(
                        key
                      )
                        ? "accent"
                        : ""
                    }`}
                    style={{
                      borderColor: "var(--line)",
                      background: "var(--secondary)",
                      color: ["+", "-", "×", "÷", "="].includes(
                        key
                      )
                        ? "var(--accent)"
                        : "var(--text)",
                    }}
                  >
                    {key}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={clearCalculator}
                  className="col-span-2 h-9 rounded-lg border text-xs font-black text-rose-400 transition hover:-translate-y-0.5"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--secondary)",
                  }}
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={backspaceCalculator}
                  className="col-span-2 h-9 rounded-lg border text-xs font-black transition hover:-translate-y-0.5"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--secondary)",
                    color: "var(--text)",
                  }}
                >
                  Backspace
                </button>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/assistant"
          aria-label="WalletIQ AI Assistant"
          title="WalletIQ AI Assistant"
          className="hidden h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5 md:grid"
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary)",
            color: "var(--text)",
          }}
        >
          <Bot size={19} />
        </Link>

        <Link
          href="/scan"
          aria-label="AI Scan receipt"
          title="AI Scan"
          className="hidden h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 transition hover:-translate-y-0.5 md:flex"
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary)",
            color: "var(--text)",
          }}
        >
          <ScanLine size={18} />
          <span>AI Scan</span>
        </Link>

        {/* MOBILE LIGHT/DARK */}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            theme === "dark"
              ? "Light mode"
              : "Dark mode"
          }
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5 sm:h-10 sm:w-10 md:hidden"
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary)",
            color: "var(--text)",
          }}
        >
          {theme === "dark" ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>

        {/* MOBILE AI */}

        <Link
          href="/assistant"
          aria-label="AI Assistant"
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5 sm:h-11 sm:w-11 md:hidden"
          style={{
            borderColor:
              "var(--line)",

            background:
              "var(--secondary)",

            color:
              "var(--text)",
          }}
        >
          <Bot size={19} />
        </Link>

        {/* MOBILE ANALYTICS - 2ND */}

        <Link
          href="/analytics"
          aria-label="Analytics"
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5 sm:h-11 sm:w-11 md:hidden"
          style={{
            borderColor:
              "var(--line)",

            background:
              "var(--secondary)",

            color:
              "var(--text)",
          }}
        >
          <BarChart3 size={19} />
        </Link>

        {/* NOTIFICATIONS - 3RD */}

        <div
          ref={box}
          className="relative"
        >
          <button
            type="button"
            aria-label="Notifications"
            onClick={
              toggleNotifications
            }
            className="relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5 sm:h-11 sm:w-11"
            style={{
              borderColor:
                "var(--line)",

              background:
                "var(--secondary)",

              color:
                "var(--text)",
            }}
          >
            <Bell
              size={18}
            />

            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                {unread > 9
                  ? "9+"
                  : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="notification-popover absolute right-0 top-14 w-[390px] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border shadow-2xl">
              <div
                className="flex items-center justify-between gap-3 border-b p-4"
                style={{
                  borderColor:
                    "var(--line)",
                }}
              >
                <div>
                  <p className="text-sm font-black">
                    Notifications
                  </p>

                  <p className="mt-1 text-xs muted">
                    {unread
                      ? `${unread} unread`
                      : "You're all caught up"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={
                      refreshNotifications
                    }
                    disabled={
                      refreshing
                    }
                    aria-label="Refresh notifications"
                    title="Refresh notifications"
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      size={15}
                      className={
                        refreshing
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>

                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      aria-label="Clear all notifications"
                      title="Clear all notifications"
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-rose-400 transition hover:bg-rose-500/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={
                        markAllRead
                      }
                      className="cursor-pointer text-xs font-bold accent"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[430px] overflow-y-auto p-2">
                {items.length ? (
                  items.map(
                    (
                      item
                    ) => (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          markRead(
                            item.id
                          )
                        }
                        className={`notification-item w-full cursor-pointer rounded-2xl p-3 text-left transition ${
                          item.read
                            ? "opacity-65"
                            : "notification-item-unread"
                        }`}
                      >
                        <div className="flex gap-3">
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              item.read
                                ? "notification-dot-read"
                                : "bg-emerald-400"
                            }`}
                          />

                          <div>
                            <p className="text-sm font-black">
                              {
                                item.title
                              }
                            </p>

                            <p className="mt-1 text-xs leading-5 muted">
                              {
                                item.body
                              }
                            </p>

                            <p className="mt-2 text-[10px] muted">
                              {new Date(
                                item.createdAt
                              ).toLocaleString(
                                "en-IN",
                                {
                                  day:
                                    "2-digit",

                                  month:
                                    "short",

                                  hour:
                                    "2-digit",

                                  minute:
                                    "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  )
                ) : (
                  <p className="p-8 text-center text-sm muted">
                    No notifications yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MOBILE SETTINGS - 4TH */}

        <Link
          href="/settings"
          aria-label="Settings"
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border transition hover:-translate-y-0.5 sm:h-11 sm:w-11 md:h-11 md:w-11"
          style={{
            borderColor:
              "var(--line)",

            background:
              "var(--secondary)",

            color:
              "var(--text)",
          }}
        >
          <Settings
            size={19}
          />
        </Link>


      </div>
    </header>
  )
}
