"use client"

import Link from "next/link"
import { Bell, Bot, Plus, ScanLine, Settings } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Logo from "./logo"

type NotificationItem = {
  id: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export default function Topbar() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" })
    if (!response.ok) return
    const data = await response.json()
    setItems(data.notifications || [])
    setUnread(data.unread || 0)
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  async function toggleNotifications() {
    const nextOpen = !open

    setOpen(nextOpen)

    if (!nextOpen) {
      return
    }

    try {
      // Generate any new notifications
      await fetch("/api/notifications", {
        method: "POST",
      })

      // Then fetch the updated list
      await loadNotifications()
    } catch (error) {
      console.error(
        "Notification refresh error:",
        error
      )
    }
  }

  useEffect(() => {
    function close(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    await loadNotifications()
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    await loadNotifications()
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-[76px] w-full items-center justify-between gap-2 border-b px-3 backdrop-blur-xl md:h-20 md:px-8"
      style={{
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        borderColor: "var(--line)",
        color: "var(--text)",
      }}
    >
      <div className="min-w-0 flex-1 md:hidden"><Logo /></div>

      <div className="hidden min-w-0 md:block">
        <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>Finance workspace</p>
        <h1 className="mt-1 text-xl font-black">Your money, made clearer.</h1>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Scan stays in the desktop topbar; on mobile it lives in Expenses with Recurring. */}
        <Link
          href="/scan"
          aria-label="Scan receipt"
          className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 transition hover:-translate-y-0.5 md:flex"
          style={{ borderColor: "var(--line)", background: "var(--secondary)", color: "var(--text)" }}
        >
          <ScanLine size={18} />
          <span>Scan</span>
        </Link>

        <Link
          href="/assistant"
          aria-label="AI Assistant"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition hover:-translate-y-0.5 md:hidden"
          style={{ borderColor: "var(--line)", background: "linear-gradient(135deg,#6ee7b7,#22c55e)", color: "#052018" }}
        >
          <Bot size={19} />
        </Link>

        {/* Notifications now work on both mobile and desktop. */}
        <div ref={box} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={toggleNotifications}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition hover:-translate-y-0.5"
            style={{ borderColor: "var(--line)", background: "var(--secondary)", color: "var(--text)" }}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="notification-popover absolute right-0 top-14 w-[390px] overflow-hidden rounded-3xl border shadow-2xl">
              <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--line)" }}>
                <div>
                  <p className="text-sm font-black">Notifications</p>
                  <p className="mt-1 text-xs muted">{unread ? `${unread} unread` : "You're all caught up"}</p>
                </div>
                {unread > 0 && <button onClick={markAllRead} className="text-xs font-bold accent">Mark all read</button>}
              </div>

              <div className="max-h-[430px] overflow-y-auto p-2">
                {items.length ? items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => markRead(item.id)}
                    className={`notification-item w-full rounded-2xl p-3 text-left transition ${item.read ? "opacity-65" : "notification-item-unread"}`}
                  >
                    <div className="flex gap-3">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.read ? "notification-dot-read" : "bg-emerald-400"}`} />
                      <div>
                        <p className="text-sm font-black">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 muted">{item.body}</p>
                        <p className="mt-2 text-[10px] muted">{new Date(item.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </button>
                )) : <p className="p-8 text-center text-sm muted">No notifications yet.</p>}
              </div>
            </div>
          )}
        </div>

        <Link
          href="/settings"
          aria-label="Settings"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition hover:-translate-y-0.5 md:hidden"
          style={{ borderColor: "var(--line)", background: "var(--secondary)", color: "var(--text)" }}
        >
          <Settings size={19} />
        </Link>

        <Link
          href="/expenses?new=1"
          className="hidden h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 md:flex"
          style={{ background: "linear-gradient(135deg,#6ee7b7,#22c55e)", color: "#052018" }}
        >
          <Plus size={17} /> Add expense
        </Link>
      </div>
    </header>
  )
}
