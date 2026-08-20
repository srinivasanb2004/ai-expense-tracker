"use client"

import AppShell from "@/components/app-shell"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  PauseCircle,
  PlayCircle,
  Trash2,
  Pencil,
  Plus,
} from "lucide-react"
import { useEffect, useState } from "react"
import Toast, { ToastState } from "@/components/toast"
import DataErrorState from "@/components/data-error-state"
import ConfirmModal from "@/components/confirm-modal"

const categories = ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Education", "Other"]
const payments = ["UPI", "Card", "Cash", "Bank Transfer", "Other"]
const frequencies = ["Weekly", "Monthly", "Yearly"]

type Recurring = {
  id: string
  merchant: string
  amount: number
  category: string
  paymentMethod: string
  frequency: string
  nextDate: string
  active: boolean
}

type DueStatus = {
  kind: "upcoming" | "tomorrow" | "today" | "overdue"
  label: string
  sublabel: string
  daysOverdue: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function dueStatus(nextDate: string): DueStatus {
  const due = new Date(nextDate)

  // nextDate is saved from an HTML date input, so use its UTC date parts to
  // preserve the selected calendar date regardless of browser timezone.
  const dueDay = Date.UTC(
    due.getUTCFullYear(),
    due.getUTCMonth(),
    due.getUTCDate()
  )

  const now = new Date()
  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const diffDays = Math.round((dueDay - today) / DAY_MS)
  const dateLabel = due.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })

  if (diffDays < 0) {
    const days = Math.abs(diffDays)
    return {
      kind: "overdue",
      label: `Overdue by ${days} ${days === 1 ? "day" : "days"}`,
      sublabel: `Due since ${dateLabel}`,
      daysOverdue: days,
    }
  }

  if (diffDays === 0) {
    return {
      kind: "today",
      label: "Due today",
      sublabel: `${dateLabel} · Payment pending`,
      daysOverdue: 0,
    }
  }

  if (diffDays === 1) {
    return {
      kind: "tomorrow",
      label: "Due tomorrow",
      sublabel: dateLabel,
      daysOverdue: 0,
    }
  }

  return {
    kind: "upcoming",
    label: `Next due: ${dateLabel}`,
    sublabel: `${diffDays} days remaining`,
    daysOverdue: 0,
  }
}

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [edit, setEdit] = useState<Recurring | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)
  const [loadError, setLoadError] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Recurring | null>(null)
  function say(message:string,type:"success"|"error"="success"){setToast({message,type});setTimeout(()=>setToast(null),2500)}

  async function load() {
    setLoading(true); setLoadError(false)
    try {
      const response = await fetch("/api/recurring", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load recurring payments")
      setItems(await response.json())
    } catch { setLoadError(true) } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget;const raw=Object.fromEntries(new FormData(form)) as Record<string,string>;const amount=Number(raw.amount);if(!raw.merchant||!raw.nextDate||!Number.isFinite(amount)||amount<=0)return setMessage("Complete all recurring payment fields.");const previous=items;const tempId=`temp-${Date.now()}`;const optimistic:Recurring={id:tempId,merchant:raw.merchant,amount,category:raw.category,paymentMethod:raw.paymentMethod,frequency:raw.frequency,nextDate:new Date(`${raw.nextDate}T00:00:00`).toISOString(),active:true};setItems(current=>[...current,optimistic]);form.reset();setBusy(true);setMessage("")
    try{const response=await fetch("/api/recurring",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(raw)});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||"Could not add recurring payment.");setItems(current=>current.map(x=>x.id===tempId?payload:x));say("Recurring payment added")}catch(error){setItems(previous);say(error instanceof Error?error.message:"Could not add recurring payment","error")}finally{setBusy(false)}
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!edit)return;const raw=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;const amount=Number(raw.amount);if(!raw.merchant||!raw.nextDate||!Number.isFinite(amount)||amount<=0)return say("Complete all recurring payment fields.","error");const previous=items;const original=edit;const optimistic:Recurring={...original,merchant:raw.merchant,amount,category:raw.category,paymentMethod:raw.paymentMethod,frequency:raw.frequency,nextDate:new Date(`${raw.nextDate}T00:00:00`).toISOString()};setItems(current=>current.map(x=>x.id===original.id?optimistic:x));setEdit(null);setBusy(true)
    try{const response=await fetch(`/api/recurring/${original.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"edit",...raw})});const d=await response.json().catch(()=>({}));if(!response.ok)throw new Error(d.error||"Could not update payment");setItems(current=>current.map(x=>x.id===original.id?d:x));say("Recurring payment updated")}catch(error){setItems(previous);setEdit(original);say(error instanceof Error?error.message:"Could not update payment","error")}finally{setBusy(false)}
  }

  async function remove(item: Recurring) {
    const previous=items; setDeleteTarget(null); setItems(current=>current.filter(x=>x.id!==item.id))
    try { const response=await fetch(`/api/recurring/${item.id}`,{method:"DELETE"}); if(!response.ok)throw new Error("Could not delete recurring payment"); say("Recurring payment deleted") }
    catch(error){setItems(previous);say(error instanceof Error?error.message:"Could not delete recurring payment","error")}
  }

  async function toggle(item: Recurring) {
    const previous=items; setItems(current=>current.map(x=>x.id===item.id?{...x,active:!x.active}:x))
    try { const response=await fetch(`/api/recurring/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:!item.active})}); if(!response.ok)throw new Error(); const updated=await response.json(); setItems(current=>current.map(x=>x.id===item.id?updated:x)) } catch { setItems(previous); say("Could not update recurring payment","error") }
  }

  async function markPaid(id: string) {
    const response = await fetch(`/api/recurring/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    })

    if (response.ok) { const updated=await response.json(); setItems(current=>current.map(x=>x.id===id?updated:x)); say("Payment recorded and next due date updated") } else { say("Could not record payment","error") }
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={()=>setToast(null)} />
      <Link
        href="/expenses"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold accent transition hover:opacity-80"
      >
        ← Back to Expenses
      </Link>

      <div>
        <p className="eyebrow">Payments</p>
        <h2 className="mt-2 text-3xl font-black">Recurring Payments</h2>
        <p className="mt-2 muted">Track subscriptions, EMI, rent and other repeating payments.</p>
      </div>

      <form onSubmit={add} className="soft-panel mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input name="merchant" className="input" placeholder="Paid to / Merchant" required />
        <input name="amount" className="input" type="number" min="1" step=".01" placeholder="Amount" required />
        <select name="category" className="input">{categories.map((x) => <option key={x}>{x}</option>)}</select>
        <select name="paymentMethod" className="input">{payments.map((x) => <option key={x}>{x}</option>)}</select>
        <select name="frequency" className="input">{frequencies.map((x) => <option key={x}>{x}</option>)}</select>
        <input name="nextDate" className="input" type="date" required />
        <button disabled={busy} className="btn btn-primary md:col-span-2 xl:col-span-3">
          {busy ? "Saving..." : "Add recurring payment"}
        </button>
      </form>

      {edit && <form onSubmit={saveEdit} className="soft-panel mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><input name="merchant" defaultValue={edit.merchant} className="input" required/><input name="amount" defaultValue={edit.amount} className="input" type="number" min="1" step=".01" required/><select name="category" defaultValue={edit.category} className="input">{categories.map(x=><option key={x}>{x}</option>)}</select><select name="paymentMethod" defaultValue={edit.paymentMethod} className="input">{payments.map(x=><option key={x}>{x}</option>)}</select><select name="frequency" defaultValue={edit.frequency} className="input">{frequencies.map(x=><option key={x}>{x}</option>)}</select><input name="nextDate" defaultValue={new Date(edit.nextDate).toISOString().slice(0,10)} className="input" type="date" required/><div className="flex gap-2 md:col-span-2 xl:col-span-3"><button disabled={busy} className="btn btn-primary">Update payment</button><button type="button" onClick={()=>setEdit(null)} className="btn btn-secondary">Cancel</button></div></form>}

      {message && <p className="mt-3 text-sm muted">{message}</p>}

      {loadError && <DataErrorState title="Unable to load recurring payments" onRetry={load} />}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {!loadError && loading && [1,2,3,4].map(x=><div key={x} className="skeleton h-52"/>)}
        {!loading && !loadError && items.map((item) => {
          const status = dueStatus(item.nextDate)
          const urgent = item.active && (status.kind === "today" || status.kind === "overdue")

          return (
            <div key={item.id} className="stat-card recurring-card">
              <div className="flex items-start gap-3">
                <div className="transaction-icon"><CalendarClock size={18} /></div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-black">{item.merchant}</h3>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.active ? "bg-emerald-400/10 accent" : "bg-white/5 muted"}`}>
                      {item.active ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm muted">
                    ₹{item.amount.toLocaleString("en-IN")} · {item.frequency} · {item.category}
                  </p>

                  {!item.active ? (
                    <div className="recurring-status recurring-status-paused mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5">
                      <PauseCircle size={16} className="mt-0.5 shrink-0 muted" />
                      <div>
                        <p className="text-xs font-black muted">Reminders paused</p>
                        <p className="mt-1 text-[11px] muted">{status.label}</p>
                      </div>
                    </div>
                  ) : status.kind === "overdue" ? (
                    <div className="recurring-status recurring-status-overdue mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5">
                      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-rose-400" />
                      <div>
                        <p className="recurring-overdue-title text-sm font-black">{status.label}</p>
                        <p className="recurring-overdue-copy mt-1 text-xs">{status.sublabel} · Please pay ₹{item.amount.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  ) : status.kind === "today" ? (
                    <div className="recurring-status recurring-status-today mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5">
                      <Clock3 size={17} className="mt-0.5 shrink-0 text-amber-300" />
                      <div>
                        <p className="recurring-today-title text-sm font-black">Due today</p>
                        <p className="recurring-today-copy mt-1 text-xs">₹{item.amount.toLocaleString("en-IN")} payment pending · Mark it paid when completed.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-start gap-2">
                      <Clock3 size={15} className="mt-0.5 shrink-0 accent" />
                      <div>
                        <p className="text-xs font-bold muted">{status.label}</p>
                        {status.kind === "tomorrow" && <p className="mt-1 text-[11px] text-amber-300">Payment reminder: due tomorrow</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => markPaid(item.id)}
                  className={`btn btn-primary ${urgent ? "ring-2 ring-emerald-300/20" : ""}`}
                >
                  <CheckCircle2 size={16} />Mark paid
                </button>

                <button onClick={() => toggle(item)} className="btn btn-secondary">
                  {item.active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                  {item.active ? "Pause" : "Resume"}
                </button>

                <button onClick={() => setEdit(item)} className="btn btn-secondary"><Pencil size={16}/>Edit</button>

                <button onClick={() => setDeleteTarget(item)} className="btn btn-secondary text-rose-400">
                  <Trash2 size={16} />Delete
                </button>
              </div>
            </div>
          )
        })}

        {!loading && !loadError && !items.length && <div className="empty-state lg:col-span-2"><CalendarClock className="mx-auto accent"/><p className="mt-3 font-black">No recurring payments yet</p><p className="mt-1 text-sm muted">Track your first subscription, rent, EMI or repeating bill.</p><button onClick={()=>document.querySelector<HTMLInputElement>('input[name=merchant]')?.focus()} className="btn btn-primary mt-4"><Plus size={16}/>Track first payment</button></div>}
      </div>
      <ConfirmModal open={!!deleteTarget} title="Delete recurring payment?" message={deleteTarget ? `Delete ${deleteTarget.merchant} from recurring payments?` : ""} confirmLabel="Delete payment" onCancel={()=>setDeleteTarget(null)} onConfirm={()=>deleteTarget&&remove(deleteTarget)} />
    </AppShell>
  )
}
