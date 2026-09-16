"use client"

import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type NotificationItem = {
  id: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export default function MobileNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const version = useRef(0)

  async function load() {
    const requestVersion = version.current
    const response = await fetch("/api/notifications", { cache: "no-store" })
    if (!response.ok) return
    const data = await response.json()
    if (requestVersion !== version.current) return
    setItems(data.notifications || [])
    setUnread(data.unread || 0)
  }

  useEffect(() => {
    void load()
    const onChange = () => void load()
    const onVisible = () => {
      if (document.visibilityState === "visible") void load()
    }
    window.addEventListener("walletiq:push", onChange)
    window.addEventListener("walletiq:notifications-changed", onChange)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("walletiq:push", onChange)
      window.removeEventListener("walletiq:notifications-changed", onChange)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  async function markAll() {
    version.current++
    setItems((current) => current.map((item) => ({ ...item, read: true })))
    setUnread(0)
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error("Could not mark notifications read")
      window.dispatchEvent(new Event("walletiq:notifications-changed"))
    } catch {
      void load()
    }
  }

  async function read(id: string) {
    version.current++
    const wasUnread = items.some((item) => item.id === id && !item.read)
    setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))
    if (wasUnread) setUnread((current) => Math.max(0, current - 1))
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error("Could not mark notification read")
      window.dispatchEvent(new Event("walletiq:notifications-changed"))
    } catch {
      void load()
    }
  }

  async function clearAll() {
    if (!items.length) return
    version.current++
    setItems([])
    setUnread(0)
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Could not clear notifications")
      window.dispatchEvent(new Event("walletiq:notifications-changed"))
    } catch {
      void load()
    }
  }

  return (
    <section className="soft-panel mt-6 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="accent" size={20} />
          <div>
            <h3 className="font-black">Notifications</h3>
            <p className="text-xs muted">{unread ? `${unread} unread` : "You're all caught up"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-bold accent">
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear all notifications"
              title="Clear all notifications"
              className="grid h-8 w-8 place-items-center rounded-lg text-rose-400 transition hover:bg-rose-500/10"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.slice(0, 8).map((item) => (
          <button key={item.id} onClick={() => read(item.id)} className={`w-full rounded-2xl border p-3 text-left ${item.read ? "opacity-60" : "bg-emerald-400/5"}`} style={{ borderColor: "var(--line)" }}>
            <p className="text-sm font-black">{item.title}</p>
            <p className="mt-1 text-xs leading-5 muted">{item.body}</p>
          </button>
        ))}
        {!items.length && <p className="py-5 text-center text-sm muted">No notifications yet.</p>}
      </div>
    </section>
  )
}
