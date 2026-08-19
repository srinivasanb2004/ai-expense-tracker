"use client"

import { Bell, CheckCheck } from "lucide-react"
import { useEffect, useState } from "react"

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

  async function load() {
    const response = await fetch("/api/notifications", { cache: "no-store" })
    if (!response.ok) return
    const data = await response.json()
    setItems(data.notifications || [])
    setUnread(data.unread || 0)
  }

  useEffect(() => { load() }, [])

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    await load()
  }

  async function read(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    await load()
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
        {unread > 0 && (
          <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-bold accent">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
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
