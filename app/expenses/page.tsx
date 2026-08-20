"use client"

import AppShell from "@/components/app-shell"
import Toast, { ToastState } from "@/components/toast"
import DataErrorState from "@/components/data-error-state"
import ConfirmModal from "@/components/confirm-modal"
import Link from "next/link"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  Search,
  Trash2,
  Plus,
  Repeat2,
  ScanLine,
  HandCoins,
  Pencil,
  ReceiptText,
} from "lucide-react"

type Expense = {
  id: string
  amount: number
  merchant: string
  category: string
  paymentMethod: string
  date: string
  notes?: string
}

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

const paymentMethods = [
  "UPI",
  "Card",
  "Cash",
  "Bank Transfer",
]

function dateInput(value: string) {
  return new Date(value)
    .toISOString()
    .slice(0, 10)
}

export default function Expenses() {
  const [expenses, setExpenses] =
    useState<Expense[]>([])

  const [query, setQuery] =
    useState("")

  const [open, setOpen] =
    useState(false)

  const [editing, setEditing] =
    useState<Expense | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [toast, setToast] =
    useState<ToastState>(null)

  const [busy, setBusy] =
    useState(false)

  const [loadError, setLoadError] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

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
    }, 2600)
  }

  async function load() {
    try {
      setLoading(true)
      setLoadError(false)

      const response =
        await fetch("/api/expenses", {
          cache: "no-store",
        })

      if (!response.ok) {
        throw new Error(
          "Failed to load expenses"
        )
      }

      const data =
        await response.json()

      setExpenses(data)
    } catch (error) {
      console.error(
        "Load expenses error:",
        error
      )

      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    const params =
      new URLSearchParams(
        window.location.search
      )

    if (params.get("new") === "1") {
      setOpen(true)
    }
  }, [])

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form=e.currentTarget; const payload=Object.fromEntries(new FormData(form)) as Record<string,string>
    const amount=Number(payload.amount); const date=payload.date
    if(!payload.merchant||!payload.category||!payload.paymentMethod||!date||!Number.isFinite(amount)||amount<=0)return say("Complete all required expense fields.","error")
    if(date>new Date().toISOString().slice(0,10))return say("Expense date cannot be in the future.","error")
    const previous=expenses; const originalEdit=editing; const tempId=originalEdit?.id||`temp-${Date.now()}`
    const optimistic:Expense={id:tempId,merchant:payload.merchant,amount,category:payload.category,paymentMethod:payload.paymentMethod,date:new Date(`${date}T00:00:00`).toISOString(),notes:payload.notes||undefined}
    setExpenses(current=>originalEdit?current.map(x=>x.id===originalEdit.id?optimistic:x):[optimistic,...current]); form.reset(); setEditing(null); setOpen(false); setBusy(true)
    try{const response=await fetch(originalEdit?`/api/expenses/${originalEdit.id}`:"/api/expenses",{method:originalEdit?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Could not save expense");setExpenses(current=>current.map(x=>x.id===tempId?data:x));say(originalEdit?"Expense updated":"Expense added")}catch(error){setExpenses(previous);if(originalEdit)setEditing(originalEdit);else setOpen(true);say(error instanceof Error?error.message:"Could not save expense","error")}finally{setBusy(false)}
  }

  async function deleteExpense(expense: Expense) {
    const previous = expenses
    setDeleteTarget(null)
    setExpenses((current) => current.filter((item) => item.id !== expense.id))
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not delete expense")
      say("Expense deleted")
    } catch (error) {
      setExpenses(previous)
      say(error instanceof Error ? error.message : "Could not delete expense", "error")
    }
  }

  function startEditing(
    expense: Expense
  ) {
    setEditing(expense)
    setOpen(false)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function cancelEditing() {
    setEditing(null)
  }

  function toggleNewExpense() {
    setEditing(null)

    setOpen((current) => !current)
  }

  const shown = useMemo(() => {
    const search =
      query
        .toLowerCase()
        .trim()

    return expenses.filter(
      (expense) =>
        `${expense.merchant} ${expense.category}`
          .toLowerCase()
          .includes(search)
    )
  }, [expenses, query])

  const total = expenses.reduce(
    (sum, expense) =>
      sum + expense.amount,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black">
            Expenses
          </h2>

          <p className="mt-1 muted">
            {expenses.length} transactions
            {" · "}₹
            {total.toLocaleString(
              "en-IN"
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/scan"
            className="btn btn-secondary md:hidden"
          >
            <ScanLine size={17} />
            Scan
          </Link>

          <Link
            href="/recurring"
            className="btn btn-secondary"
          >
            <Repeat2 size={17} />
            Recurring
          </Link>

          <Link
            href="/borrow-lend"
            className="btn btn-secondary"
          >
            <HandCoins size={17} />
            Borrow/Lend
          </Link>

          <button
            type="button"
            onClick={toggleNewExpense}
            className="btn btn-primary"
          >
            <Plus size={17} />

            {open && !editing
              ? "Close"
              : "New expense"}
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {(open || editing) && (
        <form
          key={
            editing?.id || "new"
          }
          onSubmit={save}
          className="glass card mt-6 grid gap-3 md:grid-cols-2"
        >
          <input
            name="merchant"
            defaultValue={
              editing?.merchant
            }
            className="input"
            placeholder="Paid to / Merchant"
            required
          />

          <input
            name="amount"
            defaultValue={
              editing?.amount
            }
            className="input"
            type="number"
            min=".01"
            step=".01"
            placeholder="Amount"
            required
          />

          <select
            name="category"
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

          <select
            name="paymentMethod"
            defaultValue={
              editing?.paymentMethod ||
              paymentMethods[0]
            }
            className="input"
          >
            {paymentMethods.map(
              (method) => (
                <option
                  key={method}
                  value={method}
                >
                  {method}
                </option>
              )
            )}
          </select>

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

          <input
            name="notes"
            defaultValue={
              editing?.notes || ""
            }
            className="input"
            placeholder="Notes (optional)"
          />

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary flex-1"
            >
              {busy
                ? "Saving..."
                : editing
                  ? "Update expense"
                  : "Save expense"}
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
      )}

      {loadError && <DataErrorState title="Unable to load expenses" onRetry={load} />}

      {/* Expenses Panel */}
      <div className="glass card mt-6">
        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 muted"
          />

          <input
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            className="input !pl-12"
            placeholder="Search merchant or category..."
          />
        </div>

        {/* Loading skeleton */}
        {loadError ? null : loading ? (
          <div className="mt-5 space-y-3">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="skeleton h-14 rounded-xl"
                />
              )
            )}
          </div>
        ) : shown.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="muted">
                <tr>
                  <th className="py-3 text-left">
                    Merchant
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Date
                  </th>

                  <th className="text-right">
                    Amount
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {shown.map(
                  (expense) => (
                    <tr
                      key={
                        expense.id
                      }
                      className="border-t border-white/8"
                    >
                      <td className="py-4 font-bold">
                        {
                          expense.merchant
                        }
                      </td>

                      <td className="text-center">
                        {
                          expense.category
                        }
                      </td>

                      <td className="text-center muted">
                        {
                          expense.paymentMethod
                        }
                      </td>

                      <td className="text-center muted">
                        {new Date(
                          expense.date
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>

                      <td className="text-right font-bold">
                        ₹
                        {expense.amount.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                expense
                              )
                            }
                            className="accent"
                            aria-label={`Edit ${expense.merchant}`}
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(expense)}
                            className="text-rose-400 transition hover:text-rose-300"
                            aria-label={`Delete ${expense.merchant}`}
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state mt-5">
            <ReceiptText className="mx-auto accent" />

            <p className="mt-3 font-black">
              No expenses yet
            </p>

            <p className="mt-1 text-sm muted">
              Add your first expense to
              start tracking where your
              money goes.
            </p>

            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
              className="btn btn-primary mt-4"
            >
              <Plus size={16} />
              Add first expense
            </button>
          </div>
        )}
      </div>
      <ConfirmModal open={!!deleteTarget} title="Delete expense?" message={deleteTarget ? `Delete ${deleteTarget.merchant}? This action cannot be undone.` : ""} confirmLabel="Delete expense" busy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteExpense(deleteTarget)} />
    </AppShell>
  )
}