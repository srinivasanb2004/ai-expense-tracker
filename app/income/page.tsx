"use client"

import AppShell from "@/components/app-shell"
import {
  Trash2,
  ArrowUpCircle,
} from "lucide-react"
import {
  useEffect,
  useState,
} from "react"

export default function Income() {
  const [items, setItems] = useState<any[]>(
    []
  )

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null)

  async function load() {
    const response = await fetch(
      "/api/incomes"
    )

    if (response.ok) {
      setItems(await response.json())
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function add(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    const form = e.currentTarget
    const formData = new FormData(form)

    setSaving(true)
    setMessage("")

    const response = await fetch(
      "/api/incomes",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          Object.fromEntries(
            formData
          )
        ),
      }
    )

    const data = await response
      .json()
      .catch(() => ({}))

    setSaving(false)

    if (!response.ok) {
      setMessage(
        data.error ||
          "Could not add income."
      )
      return
    }

    form.reset()

    setMessage(
      "Income added successfully."
    )

    await load()
  }

  async function deleteIncome(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this income entry? This action cannot be undone."
      )

    if (!confirmed) return

    try {
      setDeletingId(id)
      setMessage("")

      const response = await fetch(
        `/api/incomes/${id}`,
        {
          method: "DELETE",
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        setMessage(
          data.error ||
            "Could not delete income."
        )
        return
      }

      setMessage(
        "Income deleted successfully."
      )

      await load()
    } finally {
      setDeletingId(null)
    }
  }

  const totalIncome = items.reduce(
    (sum, income) =>
      sum + Number(income.amount),
    0
  )

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black">
            Income
          </h2>

          <p className="muted">
            Track salary, freelance
            and other money coming in.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs muted">
            Total income
          </p>

          <p className="text-xl font-black accent">
            ₹
            {totalIncome.toLocaleString(
              "en-IN"
            )}
          </p>
        </div>
      </div>

      <form
        onSubmit={add}
        className="soft-panel mt-6 grid gap-3 md:grid-cols-2"
      >
        <input
          name="source"
          className="input"
          placeholder="Salary / Freelance / Other"
          required
        />

        <input
          name="amount"
          className="input"
          type="number"
          min="1"
          step=".01"
          placeholder="Amount"
          required
        />

        <input
          name="date"
          className="input"
          type="date"
          required
        />

        <select
          name="category"
          className="input"
        >
          <option>Salary</option>
          <option>Freelance</option>
          <option>Business</option>
          <option>Other</option>
        </select>

        <button
          disabled={saving}
          className="btn btn-primary md:col-span-2"
        >
          {saving
            ? "Adding..."
            : "Add income"}
        </button>
      </form>

      {message && (
        <p className="mt-3 text-sm muted">
          {message}
        </p>
      )}

      <div className="soft-panel mt-6">
        {items.length ? (
          <div className="space-y-1">
            {items.map((income) => (
              <div
                key={income.id}
                className="flex items-center gap-3 rounded-2xl border-b border-white/8 py-4 last:border-b-0"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 accent">
                  <ArrowUpCircle
                    size={18}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {income.source}
                  </p>

                  <p className="mt-1 text-xs muted">
                    {income.category}
                    {" · "}
                    {new Date(
                      income.date
                    ).toLocaleDateString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <span className="whitespace-nowrap font-black accent">
                  +₹
                  {income.amount.toLocaleString(
                    "en-IN"
                  )}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    deleteIncome(
                      income.id
                    )
                  }
                  disabled={
                    deletingId ===
                    income.id
                  }
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  aria-label={`Delete ${income.source}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center muted">
            No income added yet.
          </p>
        )}
      </div>
    </AppShell>
  )
}