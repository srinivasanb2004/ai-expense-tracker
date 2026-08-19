"use client"

import AppShell from "@/components/app-shell"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search, Trash2, Plus, Repeat2, ScanLine, HandCoins } from "lucide-react"

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

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  async function load() {
    const response = await fetch("/api/expenses")
    const data = await response.json()
    setExpenses(data)
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

    await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        Object.fromEntries(formData)
      ),
    })

    form.reset()
    setOpen(false)
    await load()
  }

  async function del(id: string) {
    await fetch(`/api/expenses/${id}`, {
      method: "DELETE",
    })

    await load()
  }

  const shown = useMemo(() => {
    const search = query.toLowerCase().trim()

    return expenses.filter((expense) =>
      `${expense.merchant} ${expense.category}`
        .toLowerCase()
        .includes(search)
    )
  }, [expenses, query])

  const total = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  )

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black">
            Expenses
          </h2>

          <p className="muted mt-1">
            {expenses.length} transactions · ₹
            {total.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/scan" className="btn btn-secondary md:hidden">
            <ScanLine size={17} />
            Scan
          </Link>
          <Link href="/recurring" className="btn btn-secondary">
            <Repeat2 size={17} />
            Recurring
          </Link>
          <Link href="/borrow-lend" className="btn btn-secondary">
            <HandCoins size={17} />
            Borrow/Lend
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="btn btn-primary"
          >
            <Plus size={17} />
            {open ? "Close" : "New expense"}
          </button>
        </div>
      </div>

      {open && (
        <form
          onSubmit={add}
          className="glass card mt-6 grid gap-3 md:grid-cols-2"
        >
          <input
            name="merchant"
            className="input"
            placeholder="Paid to / Merchant"
            required
          />

          <input
            name="amount"
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            required
          />

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

          <select
            name="paymentMethod"
            className="input"
          >
            {[
              "UPI",
              "Card",
              "Cash",
              "Bank Transfer",
            ].map((method) => (
              <option
                key={method}
                value={method}
              >
                {method}
              </option>
            ))}
          </select>

          <input
            name="date"
            className="input"
            type="date"
            required
          />

          <input
            name="notes"
            className="input"
            placeholder="Notes (optional)"
          />

          <button
            type="submit"
            className="btn btn-primary md:col-span-2"
          >
            Save expense
          </button>
        </form>
      )}

      <div className="glass card mt-6">
        {/* Search */}
        <div className="relative w-full">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 muted"
          />

          <input
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            className="input !pl-12"
            placeholder="Search merchant or category..."
          />
        </div>

        {/* Expense table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="muted">
              <tr>
                <th className="py-3 text-left">
                  Merchant
                </th>

                <th>Category</th>

                <th>Payment</th>

                <th>Date</th>

                <th className="text-right">
                  Amount
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {shown.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-t border-white/8"
                >
                  <td className="py-4 font-bold">
                    {expense.merchant}
                  </td>

                  <td className="text-center">
                    {expense.category}
                  </td>

                  <td className="text-center muted">
                    {expense.paymentMethod}
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

                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() =>
                        del(expense.id)
                      }
                      className="text-rose-400 transition hover:text-rose-300"
                      aria-label={`Delete ${expense.merchant}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {shown.length === 0 && (
            <p className="py-10 text-center muted">
              {expenses.length === 0
                ? "No expenses yet."
                : "No matching expenses found."}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}