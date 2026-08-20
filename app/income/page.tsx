"use client"

import AppShell from "@/components/app-shell"
import Toast, { ToastState } from "@/components/toast"

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

      say(
        "Could not load income",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function save(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    // Save the form reference BEFORE await
    const form = e.currentTarget

    setBusy(true)

    try {
      const formData =
        new FormData(form)

      const payload =
        Object.fromEntries(
          formData
        )

      const response = await fetch(
        editing
          ? `/api/incomes/${editing.id}`
          : "/api/incomes",
        {
          method: editing
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        say(
          data.error ||
            "Could not save income",
          "error"
        )

        return
      }

      form.reset()

      say(
        editing
          ? "Income updated"
          : "Income saved"
      )

      setEditing(null)

      await load()
    } catch (error) {
      console.error(
        "Save income error:",
        error
      )

      say(
        "Could not save income",
        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  async function deleteIncome(
    item: IncomeItem
  ) {
    const confirmed =
      window.confirm(
        "Delete this income?"
      )

    if (!confirmed) return

    try {
      const response =
        await fetch(
          `/api/incomes/${item.id}`,
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
            "Could not delete income",
          "error"
        )

        return
      }

      say("Income deleted")

      // Remove instantly from UI
      setItems((current) =>
        current.filter(
          (row) =>
            row.id !== item.id
        )
      )

      if (
        editing?.id === item.id
      ) {
        setEditing(null)
      }
    } catch (error) {
      console.error(
        "Delete income error:",
        error
      )

      say(
        "Could not delete income",
        "error"
      )
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

      {/* Income List */}
      <div className="soft-panel mt-6">
        {loading ? (
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
                onClick={() =>
                  deleteIncome(item)
                }
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
    </AppShell>
  )
}