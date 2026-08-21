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

import {
  useEffect,
  useRef,
  useState,
} from "react"

import Toast, {
  ToastState,
} from "@/components/toast"

import DataErrorState from "@/components/data-error-state"
import ConfirmModal from "@/components/confirm-modal"

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

const payments = [
  "UPI",
  "Card",
  "Cash",
  "Bank Transfer",
  "Other",
]

const frequencies = [
  "Weekly",
  "Monthly",
  "Yearly",
]

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
  kind:
    | "upcoming"
    | "tomorrow"
    | "today"
    | "overdue"

  label: string
  sublabel: string
  daysOverdue: number
}

const DAY_MS =
  24 * 60 * 60 * 1000

/* ========================================
   DATE HELPERS
======================================== */

/*
  HTML date input gives:

  2026-08-20

  We deliberately treat this as UTC
  midnight instead of local midnight.

  This prevents India timezone from
  converting it to the previous UTC day.
*/

function dateInputToIso(
  value: string
) {
  return `${value}T00:00:00.000Z`
}

/*
  Get today's calendar date in India.

  This keeps localhost and Vercel
  consistent regardless of server/browser
  timezone.
*/

function indiaTodayUtc() {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Asia/Kolkata",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    )

  const year =
    Number(
      parts.find(
        (part) =>
          part.type ===
          "year"
      )?.value
    )

  const month =
    Number(
      parts.find(
        (part) =>
          part.type ===
          "month"
      )?.value
    )

  const day =
    Number(
      parts.find(
        (part) =>
          part.type ===
          "day"
      )?.value
    )

  return Date.UTC(
    year,
    month - 1,
    day
  )
}

/* ========================================
   DUE STATUS
======================================== */

function dueStatus(
  nextDate: string
): DueStatus {
  const due =
    new Date(nextDate)

  /*
    Preserve the actual stored
    calendar date.
  */

  const dueDay =
    Date.UTC(
      due.getUTCFullYear(),
      due.getUTCMonth(),
      due.getUTCDate()
    )

  /*
    Use India's current calendar date.
  */

  const today =
    indiaTodayUtc()

  const diffDays =
    Math.round(
      (dueDay -
        today) /
        DAY_MS
    )

  const dateLabel =
    due.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }
    )

  /* OVERDUE */

  if (
    diffDays < 0
  ) {
    const days =
      Math.abs(
        diffDays
      )

    return {
      kind:
        "overdue",

      label:
        `Overdue by ${days} ${
          days === 1
            ? "day"
            : "days"
        }`,

      sublabel:
        `Due since ${dateLabel}`,

      daysOverdue:
        days,
    }
  }

  /* DUE TODAY */

  if (
    diffDays === 0
  ) {
    return {
      kind:
        "today",

      label:
        "Due today",

      sublabel:
        `${dateLabel} · Payment pending`,

      daysOverdue:
        0,
    }
  }

  /* DUE TOMORROW */

  if (
    diffDays === 1
  ) {
    return {
      kind:
        "tomorrow",

      label:
        "Due tomorrow",

      sublabel:
        dateLabel,

      daysOverdue:
        0,
    }
  }

  /* FUTURE */

  return {
    kind:
      "upcoming",

    label:
      `Next due: ${dateLabel}`,

    sublabel:
      `${diffDays} days remaining`,

    daysOverdue:
      0,
  }
}


function DateField({
  name,
  placeholder,
  required = false,
  defaultValue = "",
  max,
}: {
  name: string
  placeholder: string
  required?: boolean
  defaultValue?: string
  max?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return

    function handleReset() {
      setValue(defaultValue)
    }

    form.addEventListener("reset", handleReset)
    return () => form.removeEventListener("reset", handleReset)
  }, [defaultValue])

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
        name={name}
        type="date"
        value={value}
        required={required}
        max={max}
        onChange={(e) => setValue(e.target.value)}
        className={`input w-full ${!value ? "text-transparent" : ""}`}
      />

      {!value && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-sm"
          style={{ color: "var(--muted)" }}
        >
          {placeholder}
        </span>
      )}
    </div>
  )
}

export default function RecurringPage() {
  const [
    items,
    setItems,
  ] =
    useState<
      Recurring[]
    >([])

  const [
    busy,
    setBusy,
  ] =
    useState(false)

  const [
    message,
    setMessage,
  ] =
    useState("")

  const [
    edit,
    setEdit,
  ] =
    useState<
      Recurring | null
    >(null)

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    toast,
    setToast,
  ] =
    useState<
      ToastState
    >(null)

  const [
    loadError,
    setLoadError,
  ] =
    useState(false)

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      Recurring | null
    >(null)

  function say(
    message: string,
    type:
      | "success"
      | "error" =
      "success"
  ) {
    setToast({
      message,
      type,
    })

    setTimeout(
      () =>
        setToast(
          null
        ),
      2500
    )
  }

  /* ========================================
     LOAD
  ======================================== */

  async function load() {
    setLoading(true)
    setLoadError(false)

    try {
      const response =
        await fetch(
          "/api/recurring",
          {
            cache:
              "no-store",
          }
        )

      if (
        !response.ok
      ) {
        throw new Error(
          "Could not load recurring payments"
        )
      }

      const data =
        await response.json()

      setItems(data)
    } catch {
      setLoadError(
        true
      )
    } finally {
      setLoading(
        false
      )
    }
  }

  useEffect(() => {
    load()
  }, [])

  /* ========================================
     ADD
  ======================================== */

  async function add(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    const form =
      e.currentTarget

    const raw =
      Object.fromEntries(
        new FormData(
          form
        )
      ) as Record<
        string,
        string
      >

    const amount =
      Number(
        raw.amount
      )

    if (
      !raw.merchant ||
      !raw.nextDate ||
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setMessage(
        "Complete all recurring payment fields."
      )

      return
    }

    const previous =
      items

    const tempId =
      `temp-${Date.now()}`

    /*
      IMPORTANT FIX:

      Previously this used:
      new Date(`${raw.nextDate}T00:00:00`).toISOString()

      In India that shifts the optimistic
      date back one UTC day.

      Now we preserve the selected date.
    */

    const optimistic:
      Recurring = {
      id:
        tempId,

      merchant:
        raw.merchant,

      amount,

      category:
        raw.category,

      paymentMethod:
        raw.paymentMethod,

      frequency:
        raw.frequency,

      nextDate:
        dateInputToIso(
          raw.nextDate
        ),

      active:
        true,
    }

    setItems(
      (current) => [
        ...current,
        optimistic,
      ]
    )

    form.reset()

    setBusy(true)
    setMessage("")

    try {
      const response =
        await fetch(
          "/api/recurring",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                raw
              ),
          }
        )

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          )

      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ||
            "Could not add recurring payment."
        )
      }

      setItems(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              tempId
                ? payload
                : item
          )
      )

      say(
        "Recurring payment added"
      )
    } catch (
      error
    ) {
      setItems(
        previous
      )

      say(
        error instanceof
          Error
          ? error.message
          : "Could not add recurring payment",

        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     EDIT
  ======================================== */

  async function saveEdit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!edit) {
      return
    }

    const form =
      e.currentTarget

    const raw =
      Object.fromEntries(
        new FormData(
          form
        )
      ) as Record<
        string,
        string
      >

    const amount =
      Number(
        raw.amount
      )

    if (
      !raw.merchant ||
      !raw.nextDate ||
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      say(
        "Complete all recurring payment fields.",
        "error"
      )

      return
    }

    const previous =
      items

    const original =
      edit

    const optimistic:
      Recurring = {
      ...original,

      merchant:
        raw.merchant,

      amount,

      category:
        raw.category,

      paymentMethod:
        raw.paymentMethod,

      frequency:
        raw.frequency,

      nextDate:
        dateInputToIso(
          raw.nextDate
        ),
    }

    setItems(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            original.id
              ? optimistic
              : item
        )
    )

    setEdit(null)

    setBusy(true)

    try {
      const response =
        await fetch(
          `/api/recurring/${original.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  action:
                    "edit",

                  ...raw,
                }
              ),
          }
        )

      const data =
        await response
          .json()
          .catch(
            () => ({})
          )

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Could not update payment"
        )
      }

      setItems(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              original.id
                ? data
                : item
          )
      )

      say(
        "Recurring payment updated"
      )
    } catch (
      error
    ) {
      setItems(
        previous
      )

      setEdit(
        original
      )

      say(
        error instanceof
          Error
          ? error.message
          : "Could not update payment",

        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     DELETE
  ======================================== */

  async function remove(
    item: Recurring
  ) {
    const previous =
      items

    setDeleteTarget(
      null
    )

    setItems(
      (current) =>
        current.filter(
          (row) =>
            row.id !==
            item.id
        )
    )

    try {
      const response =
        await fetch(
          `/api/recurring/${item.id}`,
          {
            method:
              "DELETE",
          }
        )

      if (
        !response.ok
      ) {
        throw new Error(
          "Could not delete recurring payment"
        )
      }

      say(
        "Recurring payment deleted"
      )
    } catch (
      error
    ) {
      setItems(
        previous
      )

      say(
        error instanceof
          Error
          ? error.message
          : "Could not delete recurring payment",

        "error"
      )
    }
  }

  /* ========================================
     PAUSE / RESUME
  ======================================== */

  async function toggle(
    item: Recurring
  ) {
    const previous =
      items

    setItems(
      (current) =>
        current.map(
          (row) =>
            row.id ===
            item.id
              ? {
                  ...row,
                  active:
                    !row.active,
                }
              : row
        )
    )

    try {
      const response =
        await fetch(
          `/api/recurring/${item.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  active:
                    !item.active,
                }
              ),
          }
        )

      if (
        !response.ok
      ) {
        throw new Error()
      }

      const updated =
        await response.json()

      setItems(
        (current) =>
          current.map(
            (row) =>
              row.id ===
              item.id
                ? updated
                : row
          )
      )
    } catch {
      setItems(
        previous
      )

      say(
        "Could not update recurring payment",
        "error"
      )
    }
  }

  /* ========================================
     MARK PAID
  ======================================== */

  async function markPaid(
    id: string
  ) {
    try {
      const response =
        await fetch(
          `/api/recurring/${id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  action:
                    "mark_paid",
                }
              ),
          }
        )

      if (
        !response.ok
      ) {
        throw new Error()
      }

      const updated =
        await response.json()

      setItems(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              id
                ? updated
                : item
          )
      )

      say(
        "Payment recorded and next due date updated"
      )
    } catch {
      say(
        "Could not record payment",
        "error"
      )
    }
  }

  return (
    <AppShell>
      <Toast
        toast={toast}
        onClose={() =>
          setToast(
            null
          )
        }
      />

      <Link
        href="/expenses"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold accent transition hover:opacity-80"
      >
        ← Back to Expenses
      </Link>

      <div>
        <p className="eyebrow">
          Payments
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Recurring Payments
        </h2>

        <p className="mt-2 muted">
          Track subscriptions,
          EMI, rent and other
          repeating payments.
        </p>
      </div>

      {/* ADD FORM */}

      <form
        onSubmit={add}
        className="soft-panel mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
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
          min="1"
          step=".01"
          placeholder="Amount"
          required
        />

        <select
          name="category"
          className="input"
        >
          {categories.map(
            (category) => (
              <option
                key={
                  category
                }
                value={
                  category
                }
              >
                {category}
              </option>
            )
          )}
        </select>

        <select
          name="paymentMethod"
          className="input"
        >
          {payments.map(
            (payment) => (
              <option
                key={
                  payment
                }
                value={
                  payment
                }
              >
                {payment}
              </option>
            )
          )}
        </select>

        <select
          name="frequency"
          className="input"
        >
          {frequencies.map(
            (frequency) => (
              <option
                key={
                  frequency
                }
                value={
                  frequency
                }
              >
                {frequency}
              </option>
            )
          )}
        </select>

        <DateField
          name="nextDate"
          placeholder="Next due date"
          required
        />

        <button
          disabled={busy}
          className="btn btn-primary md:col-span-2 xl:col-span-3"
        >
          {busy
            ? "Saving..."
            : "Add recurring payment"}
        </button>
      </form>

      {/* EDIT FORM */}

      {edit && (
        <form
          onSubmit={
            saveEdit
          }
          className="soft-panel mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          <input
            name="merchant"
            defaultValue={
              edit.merchant
            }
            className="input"
            required
          />

          <input
            name="amount"
            defaultValue={
              edit.amount
            }
            className="input"
            type="number"
            min="1"
            step=".01"
            required
          />

          <select
            name="category"
            defaultValue={
              edit.category
            }
            className="input"
          >
            {categories.map(
              (category) => (
                <option
                  key={
                    category
                  }
                  value={
                    category
                  }
                >
                  {
                    category
                  }
                </option>
              )
            )}
          </select>

          <select
            name="paymentMethod"
            defaultValue={
              edit.paymentMethod
            }
            className="input"
          >
            {payments.map(
              (payment) => (
                <option
                  key={
                    payment
                  }
                  value={
                    payment
                  }
                >
                  {
                    payment
                  }
                </option>
              )
            )}
          </select>

          <select
            name="frequency"
            defaultValue={
              edit.frequency
            }
            className="input"
          >
            {frequencies.map(
              (frequency) => (
                <option
                  key={
                    frequency
                  }
                  value={
                    frequency
                  }
                >
                  {
                    frequency
                  }
                </option>
              )
            )}
          </select>

          <DateField
            key={`next-date-${edit.id}`}
            name="nextDate"
            placeholder="Next due date"
            defaultValue={
              new Date(edit.nextDate)
                .toISOString()
                .slice(0, 10)
            }
            required
          />

          <div className="flex gap-2 md:col-span-2 xl:col-span-3">
            <button
              disabled={
                busy
              }
              className="btn btn-primary"
            >
              Update payment
            </button>

            <button
              type="button"
              onClick={() =>
                setEdit(
                  null
                )
              }
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className="mt-3 text-sm muted">
          {message}
        </p>
      )}

      {loadError && (
        <DataErrorState
          title="Unable to load recurring payments"
          onRetry={load}
        />
      )}

      {/* CARDS */}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {!loadError &&
          loading &&
          [
            1,
            2,
            3,
            4,
          ].map(
            (item) => (
              <div
                key={
                  item
                }
                className="skeleton h-52"
              />
            )
          )}

        {!loading &&
          !loadError &&
          items.map(
            (item) => {
              const status =
                dueStatus(
                  item.nextDate
                )

              const urgent =
                item.active &&
                (status.kind ===
                  "today" ||
                  status.kind ===
                    "overdue")

              return (
                <div
                  key={
                    item.id
                  }
                  className="stat-card recurring-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="transaction-icon">
                      <CalendarClock
                        size={
                          18
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-black">
                          {
                            item.merchant
                          }
                        </h3>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${
                            item.active
                              ? "bg-emerald-400/10 accent"
                              : "bg-white/5 muted"
                          }`}
                        >
                          {item.active
                            ? "ACTIVE"
                            : "PAUSED"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm muted">
                        ₹
                        {item.amount.toLocaleString(
                          "en-IN"
                        )}{" "}
                        ·{" "}
                        {
                          item.frequency
                        }{" "}
                        ·{" "}
                        {
                          item.category
                        }
                      </p>

                      {/* PAUSED */}

                      {!item.active ? (
                        <div className="recurring-status recurring-status-paused mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5">
                          <PauseCircle
                            size={
                              16
                            }
                            className="mt-0.5 shrink-0 muted"
                          />

                          <div>
                            <p className="text-xs font-black muted">
                              Reminders
                              paused
                            </p>

                            <p className="mt-1 text-[11px] muted">
                              {
                                status.label
                              }
                            </p>
                          </div>
                        </div>
                      ) : status.kind ===
                        "overdue" ? (
                        <div className="recurring-status recurring-status-overdue mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5">
                          <AlertTriangle
                            size={
                              17
                            }
                            className="mt-0.5 shrink-0 text-rose-400"
                          />

                          <div>
                            <p className="recurring-overdue-title text-sm font-black">
                              {
                                status.label
                              }
                            </p>

                            <p className="recurring-overdue-copy mt-1 text-xs">
                              {
                                status.sublabel
                              }{" "}
                              · Please
                              pay ₹
                              {item.amount.toLocaleString(
                                "en-IN"
                              )}
                            </p>
                          </div>
                        </div>
                      ) : status.kind ===
                        "today" ? (
                        <div className="recurring-status recurring-status-today mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5">
                          <Clock3
                            size={
                              17
                            }
                            className="mt-0.5 shrink-0 text-amber-300"
                          />

                          <div>
                            <p className="recurring-today-title text-sm font-black">
                              Due
                              today
                            </p>

                            <p className="recurring-today-copy mt-1 text-xs">
                              ₹
                              {item.amount.toLocaleString(
                                "en-IN"
                              )}{" "}
                              payment
                              pending
                              · Mark
                              it paid
                              when
                              completed.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-start gap-2">
                          <Clock3
                            size={
                              15
                            }
                            className="mt-0.5 shrink-0 accent"
                          />

                          <div>
                            <p className="text-xs font-bold muted">
                              {
                                status.label
                              }
                            </p>

                            {status.kind ===
                              "tomorrow" && (
                              <p className="mt-1 text-[11px] text-amber-300">
                                Payment
                                reminder:
                                due
                                tomorrow
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        markPaid(
                          item.id
                        )
                      }
                      className={`btn btn-primary ${
                        urgent
                          ? "ring-2 ring-emerald-300/20"
                          : ""
                      }`}
                    >
                      <CheckCircle2
                        size={
                          16
                        }
                      />
                      Mark paid
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggle(
                          item
                        )
                      }
                      className="btn btn-secondary"
                    >
                      {item.active ? (
                        <PauseCircle
                          size={
                            16
                          }
                        />
                      ) : (
                        <PlayCircle
                          size={
                            16
                          }
                        />
                      )}

                      {item.active
                        ? "Pause"
                        : "Resume"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEdit(
                          item
                        )
                      }
                      className="btn btn-secondary"
                    >
                      <Pencil
                        size={
                          16
                        }
                      />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget(
                          item
                        )
                      }
                      className="btn btn-secondary text-rose-400"
                    >
                      <Trash2
                        size={
                          16
                        }
                      />
                      Delete
                    </button>
                  </div>
                </div>
              )
            }
          )}

        {!loading &&
          !loadError &&
          !items.length && (
            <div className="empty-state lg:col-span-2">
              <CalendarClock className="mx-auto accent" />

              <p className="mt-3 font-black">
                No recurring
                payments yet
              </p>

              <p className="mt-1 text-sm muted">
                Track your first
                subscription, rent,
                EMI or repeating
                bill.
              </p>

              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>(
                      'input[name="merchant"]'
                    )
                    ?.focus()
                }
                className="btn btn-primary mt-4"
              >
                <Plus
                  size={16}
                />
                Track first
                payment
              </button>
            </div>
          )}
      </div>

      <ConfirmModal
        open={
          !!deleteTarget
        }
        title="Delete recurring payment?"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.merchant} from recurring payments?`
            : ""
        }
        confirmLabel="Delete payment"
        onCancel={() =>
          setDeleteTarget(
            null
          )
        }
        onConfirm={() =>
          deleteTarget &&
          remove(
            deleteTarget
          )
        }
      />
    </AppShell>
  )
}