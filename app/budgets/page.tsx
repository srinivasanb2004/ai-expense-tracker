"use client"

import AppShell from "@/components/app-shell"
import {
  AlertTriangle,
  Target,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Education",
  "Other",
]

export default function Budgets() {
  const [items, setItems] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    const response = await fetch("/api/budgets")

    if (response.ok) {
      setItems(await response.json())
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function save(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    const form = e.currentTarget
    const formData = new FormData(form)

    setBusy(true)
    setMsg("")

    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        Object.fromEntries(formData)
      ),
    })

    const data = await response
      .json()
      .catch(() => ({}))

    setBusy(false)

    if (!response.ok) {
      setMsg(
        data.error || "Could not save budget"
      )
      return
    }

    form.reset()
    setMsg("Budget saved successfully.")
    await load()
  }

  async function deleteBudget(id: string) {
    const confirmed = window.confirm(
      "Delete this budget? This action cannot be undone."
    )

    if (!confirmed) return

    try {
      setDeletingId(id)
      setMsg("")

      const response = await fetch(
        `/api/budgets/${id}`,
        {
          method: "DELETE",
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        setMsg(
          data.error ||
            "Could not delete budget"
        )
        return
      }

      setMsg("Budget deleted successfully.")
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AppShell>
      <h2 className="text-3xl font-black">
        Budgets
      </h2>

      <p className="muted">
        Set category limits for the current month.
      </p>

      <form
        onSubmit={save}
        className="soft-panel mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <select
          name="category"
          className="input"
        >
          {categories.map((category) => (
            <option
              key={category}
              value={category}
            >
              {category}
            </option>
          ))}
        </select>

        <input
          name="amount"
          className="input"
          type="number"
          min="1"
          step=".01"
          placeholder="Monthly limit ₹"
          required
        />

        <button
          disabled={busy}
          className="btn btn-primary sm:w-48"
        >
          {busy
            ? "Saving..."
            : "Set budget"}
        </button>
      </form>

      {msg && (
        <p className="mt-3 text-sm muted">
          {msg}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((budget) => {
          const percentage = budget.amount
            ? Math.min(
                100,
                (budget.spent /
                  budget.amount) *
                  100
              )
            : 0

          return (
            <div
              key={budget.id}
              className="stat-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <b>{budget.category}</b>

                  <p className="text-sm muted">
                    ₹
                    {budget.spent.toLocaleString(
                      "en-IN"
                    )}{" "}
                    of ₹
                    {budget.amount.toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {budget.spent >=
                  budget.amount ? (
                    <AlertTriangle className="text-amber-300" />
                  ) : (
                    <Target className="accent" />
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      deleteBudget(
                        budget.id
                      )
                    }
                    disabled={
                      deletingId ===
                      budget.id
                    }
                    className="grid h-9 w-9 place-items-center rounded-xl text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                    aria-label={`Delete ${budget.category} budget`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="progress-track mt-5">
                <div
                  className="progress-value"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-right text-xs muted">
                {percentage.toFixed(0)}%
              </p>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="soft-panel md:col-span-2 xl:col-span-3">
            <p className="py-6 text-center muted">
              No budgets set yet.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}