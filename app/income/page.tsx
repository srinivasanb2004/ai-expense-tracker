"use client"

import AppShell from "@/components/app-shell"
import Toast, { ToastState } from "@/components/toast"
import DataErrorState from "@/components/data-error-state"
import ConfirmModal from "@/components/confirm-modal"

import {
  ArrowUpCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import {
  useEffect,
  useState,
} from "react"

type IncomeItem = {
  id: string
  source: string
  amount: number
  date: string
  category: string
  notes?: string
}

function dateInput(value: string) {
  return new Date(value)
    .toISOString()
    .slice(0, 10)
}

export default function Income() {
  const [items, setItems] =
    useState<IncomeItem[]>([])

  const [editing, setEditing] =
    useState<IncomeItem | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [busy, setBusy] =
    useState(false)

  const [toast, setToast] =
    useState<ToastState>(null)
  const [loadError, setLoadError] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<IncomeItem | null>(null)

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
    }, 2500)
  }

  async function load() {
    try {
      setLoading(true)
      setLoadError(false)

      const response = await fetch(
        "/api/incomes",
        {
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error(
          "Failed to load income"
        )
      }

      const data =
        await response.json()

      setItems(data)
    } catch (error) {
      console.error(
        "Load income error:",
        error
      )

      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget;const payload=Object.fromEntries(new FormData(form)) as Record<string,string>;const amount=Number(payload.amount);if(!payload.source||!payload.date||!Number.isFinite(amount)||amount<=0)return say("Complete all required income fields.","error");if(payload.date>new Date().toISOString().slice(0,10))return say("Income date cannot be in the future.","error")
    const previous=items;const originalEdit=editing;const tempId=originalEdit?.id||`temp-${Date.now()}`;const optimistic:IncomeItem={id:tempId,source:payload.source,amount,date:new Date(`${payload.date}T00:00:00`).toISOString(),category:payload.category||"Salary",notes:payload.notes||undefined};setItems(current=>originalEdit?current.map(x=>x.id===originalEdit.id?optimistic:x):[optimistic,...current]);form.reset();setEditing(null);setBusy(true)
    try{const response=await fetch(originalEdit?`/api/incomes/${originalEdit.id}`:"/api/incomes",{method:originalEdit?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Could not save income");setItems(current=>current.map(x=>x.id===tempId?data:x));say(originalEdit?"Income updated":"Income saved")}catch(error){setItems(previous);if(originalEdit)setEditing(originalEdit);say(error instanceof Error?error.message:"Could not save income","error")}finally{setBusy(false)}
  }

  async function deleteIncome(item: IncomeItem) {
    const previous = items
    setDeleteTarget(null)
    setItems((current) => current.filter((row) => row.id !== item.id))
    try {
      const response = await fetch(`/api/incomes/${item.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not delete income")
      say("Income deleted")
      if (editing?.id === item.id) setEditing(null)
    } catch (error) {
      setItems(previous)
      say(error instanceof Error ? error.message : "Could not delete income", "error")
    }
  }

  function startEditing(
    item: IncomeItem
  ) {
    setEditing(item)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function cancelEditing() {
    setEditing(null)
  }

  function focusSourceInput() {
    document
      .querySelector<HTMLInputElement>(
        'input[name="source"]'
      )
      ?.focus()
  }

  const total = items.reduce(
    (sum, item) =>
      sum + item.amount,
    0
  )

  return (
    <AppShell>
      <Toast
        toast={toast}
        onClose={() =>
          setToast(null)
        }
      />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black">
            Income
          </h2>

          <p className="muted">
            Track salary, freelance and
            other money coming in.
          </p>
        </div>

        <p className="text-xl font-black accent">
          ₹
          {total.toLocaleString(
            "en-IN"
          )}
        </p>
      </div>

      {/* Add / Edit Form */}
      <form
        key={
          editing?.id || "new"
        }
        onSubmit={save}
        className="soft-panel mt-6 grid gap-3 md:grid-cols-2"
      >
        <input
          name="source"
          defaultValue={
            editing?.source
          }
          className="input"
          placeholder="Salary / Freelance / Other"
          required
        />

        <input
          name="amount"
          defaultValue={
            editing?.amount
          }
          className="input"
          type="number"
          min="1"
          step=".01"
          placeholder="Amount"
          required
        />

        <input
          name="date"
          defaultValue={
            editing
              ? dateInput(
                  editing.date
                )
              : ""
          }
          className="input"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          required
        />

        <select
          name="category"
          defaultValue={
            editing?.category ||
            "Salary"
          }
          className="input"
        >
          <option value="Salary">
            Salary
          </option>

          <option value="Freelance">
            Freelance
          </option>

          <option value="Business">
            Business
          </option>

          <option value="Other">
            Other
          </option>
        </select>

        <div className="flex gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary flex-1"
          >
            {busy
              ? "Saving..."
              : editing
                ? "Update income"
                : "Add income"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={
                cancelEditing
              }
              disabled={busy}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loadError && <DataErrorState title="Unable to load income" onRetry={load} />}

      {/* Income List */}
      <div className="soft-panel mt-6">
        {loadError ? null : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="skeleton h-14 rounded-xl"
                />
              )
            )}
          </div>
        ) : items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border-b border-white/8 py-4 last:border-0"
            >
              <div className="transaction-icon">
                <ArrowUpCircle
                  size={18}
                />
              </div>

              <div className="min-w-0 flex-1">
                <b className="block truncate">
                  {item.source}
                </b>

                <p className="text-xs muted">
                  {item.category}
                  {" · "}
                  {new Date(
                    item.date
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </p>
              </div>

              <b className="whitespace-nowrap accent">
                +₹
                {item.amount.toLocaleString(
                  "en-IN"
                )}
              </b>

              <button
                type="button"
                onClick={() =>
                  startEditing(item)
                }
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg accent transition hover:bg-emerald-400/10"
                aria-label={`Edit ${item.source}`}
              >
                <Pencil
                  size={16}
                />
              </button>

              <button
                type="button"
                onClick={() => setDeleteTarget(item)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={`Delete ${item.source}`}
              >
                <Trash2
                  size={16}
                />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <ArrowUpCircle className="mx-auto accent" />

            <p className="mt-3 font-black">
              No income added yet
            </p>

            <p className="mt-1 text-sm muted">
              Add your first income to
              calculate your real
              available balance.
            </p>

            <button
              type="button"
              onClick={
                focusSourceInput
              }
              className="btn btn-primary mt-4"
            >
              <Plus size={16} />
              Add first income
            </button>
          </div>
        )}
      </div>
      <ConfirmModal open={!!deleteTarget} title="Delete income?" message="This income entry will be permanently deleted." confirmLabel="Delete income" onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteIncome(deleteTarget)} />
    </AppShell>
  )
}