"use client"

import AppShell from "@/components/app-shell"
import Toast, { ToastState } from "@/components/toast"

import {
  AlertTriangle,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react"

import {
  useEffect,
  useState,
} from "react"

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

type Budget = {
  id: string
  category: string
  amount: number
  spent: number
}

export default function Budgets() {
  const [budgets, setBudgets] =
    useState<Budget[]>([])

  const [editing, setEditing] =
    useState<Budget | null>(null)

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
        "/api/budgets",
        {
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error(
          "Failed to load budgets"
        )
      }

      const data =
        await response.json()

      setBudgets(data)
    } catch (error) {
      console.error(
        "Load budgets error:",
        error
      )

      say(
        "Could not load budgets",
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

    // Save form reference BEFORE await
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
          ? `/api/budgets/${editing.id}`
          : "/api/budgets",
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
            "Could not save budget",
          "error"
        )

        return
      }

      form.reset()

      say(
        editing
          ? "Budget updated"
          : "Budget saved"
      )

      setEditing(null)

      await load()
    } catch (error) {
      console.error(
        "Save budget error:",
        error
      )

      say(
        "Could not save budget",
        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  async function deleteBudget(
    budget: Budget
  ) {
    const confirmed =
      window.confirm(
        `Delete ${budget.category} budget?`
      )

    if (!confirmed) return

    try {
      const response =
        await fetch(
          `/api/budgets/${budget.id}`,
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
            "Could not delete budget",
          "error"
        )

        return
      }

      say("Budget deleted")

      // Update UI immediately
      setBudgets((current) =>
        current.filter(
          (item) =>
            item.id !== budget.id
        )
      )

      if (
        editing?.id === budget.id
      ) {
        setEditing(null)
      }
    } catch (error) {
      console.error(
        "Delete budget error:",
        error
      )

      say(
        "Could not delete budget",
        "error"
      )
    }
  }

  function startEditing(
    budget: Budget
  ) {
    setEditing(budget)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function cancelEditing() {
    setEditing(null)
  }

  function focusAmountInput() {
    document
      .querySelector<HTMLInputElement>(
        'input[name="amount"]'
      )
      ?.focus()
  }

  return (
    <AppShell>
      <Toast
        toast={toast}
        onClose={() =>
          setToast(null)
        }
      />

      <h2 className="text-3xl font-black">
        Budgets
      </h2>

      <p className="mt-1 muted">
        Set category limits for the
        current month.
      </p>

      {/* Add / Edit Budget */}
      <form
        key={
          editing?.id || "new"
        }
        onSubmit={save}
        className="soft-panel mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <select
          name="category"
          disabled={!!editing}
          defaultValue={
            editing?.category ||
            categories[0]
          }
          className="input"
        >
          {categories.map(
            (category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            )
          )}
        </select>

        <input
          name="amount"
          defaultValue={
            editing?.amount
          }
          className="input"
          type="number"
          min="1"
          step=".01"
          placeholder="Monthly limit ₹"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary sm:w-48"
        >
          {busy
            ? "Saving..."
            : editing
              ? "Update budget"
              : "Set budget"}
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
      </form>

      {/* Budget Cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="skeleton h-40 rounded-2xl"
              />
            )
          )
        ) : budgets.length ? (
          budgets.map((budget) => {
            const percentage =
              budget.amount
                ? Math.min(
                    100,
                    (budget.spent /
                      budget.amount) *
                      100
                  )
                : 0

            const exceeded =
              budget.spent >=
              budget.amount

            return (
              <div
                key={budget.id}
                className="stat-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <b>
                      {
                        budget.category
                      }
                    </b>

                    <p className="mt-1 text-sm muted">
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
                    {exceeded ? (
                      <AlertTriangle className="text-amber-300" />
                    ) : (
                      <Target className="accent" />
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        startEditing(
                          budget
                        )
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg accent transition hover:bg-emerald-400/10"
                      aria-label={`Edit ${budget.category} budget`}
                    >
                      <Pencil
                        size={16}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteBudget(
                          budget
                        )
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                      aria-label={`Delete ${budget.category} budget`}
                    >
                      <Trash2
                        size={16}
                      />
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
                  {percentage.toFixed(
                    0
                  )}
                  %
                </p>

                {exceeded && (
                  <p className="mt-3 text-xs font-bold text-amber-300">
                    Budget limit reached
                  </p>
                )}
              </div>
            )
          })
        ) : (
          <div className="empty-state md:col-span-2 xl:col-span-3">
            <Target className="mx-auto accent" />

            <p className="mt-3 font-black">
              No budgets set yet
            </p>

            <p className="mt-1 text-sm muted">
              Set your first category
              budget and get warnings
              before you overspend.
            </p>

            <button
              type="button"
              onClick={
                focusAmountInput
              }
              className="btn btn-primary mt-4"
            >
              <Plus size={16} />
              Set first budget
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}