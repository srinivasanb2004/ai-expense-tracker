"use client"

import AppShell from "@/components/app-shell"
import Link from "next/link"

import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HandCoins,
  History,
  Plus,
  Trash2,
  Pencil,
  UserRound,
} from "lucide-react"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import Toast, {
  ToastState,
} from "@/components/toast"

import DataErrorState from "@/components/data-error-state"
import ConfirmModal from "@/components/confirm-modal"

type Repayment = {
  id: string
  amount: number
  date: string
  notes?: string | null
}

type RecordItem = {
  id: string
  person: string
  phone?: string | null
  type: "BORROWED" | "LENT"
  amount: number
  repaid: number
  remaining: number
  startDate: string
  dueDate?: string | null
  notes?: string | null
  status:
    | "PENDING"
    | "PARTIAL"
    | "SETTLED"
  settledAt?: string | null
  repayments: Repayment[]
}

type DueInfo = {
  kind:
    | "open"
    | "upcoming"
    | "tomorrow"
    | "today"
    | "overdue"
    | "settled"

  label: string
  copy: string
}

const DAY =
  86_400_000

function money(
  value: number
) {
  return `₹${Number(
    value
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits:
        2,
    }
  )}`
}

/* ========================================
   DATE HELPERS
======================================== */

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

function dateInputToIso(
  value: string
) {
  return `${value}T00:00:00.000Z`
}

/* ========================================
   DUE STATUS
======================================== */

function dueInfo(
  item: RecordItem
): DueInfo {
  if (
    item.status ===
    "SETTLED"
  ) {
    return {
      kind:
        "settled",

      label:
        "Settled",

      copy:
        item.settledAt
          ? `Settled ${new Date(
              item.settledAt
            ).toLocaleDateString(
              "en-IN"
            )}`
          : "Fully settled",
    }
  }

  if (
    !item.dueDate
  ) {
    return {
      kind:
        "open",

      label:
        item.status ===
        "PARTIAL"
          ? "Partially paid"
          : "Pending",

      copy:
        "No due date set",
    }
  }

  const due =
    new Date(
      item.dueDate
    )

  const dueDay =
    Date.UTC(
      due.getUTCFullYear(),
      due.getUTCMonth(),
      due.getUTCDate()
    )

  const diff =
    Math.round(
      (dueDay -
        indiaTodayUtc()) /
        DAY
    )

  const label =
    due.toLocaleDateString(
      "en-IN",
      {
        day:
          "2-digit",
        month:
          "short",
        year:
          "numeric",
        timeZone:
          "UTC",
      }
    )

  if (
    diff < 0
  ) {
    const days =
      Math.abs(
        diff
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

      copy:
        `Due since ${label}`,
    }
  }

  if (
    diff === 0
  ) {
    return {
      kind:
        "today",

      label:
        "Due today",

      copy:
        `${money(
          item.remaining
        )} still pending`,
    }
  }

  if (
    diff === 1
  ) {
    return {
      kind:
        "tomorrow",

      label:
        "Due tomorrow",

      copy:
        label,
    }
  }

  return {
    kind:
      "upcoming",

    label:
      `Due in ${diff} days`,

    copy:
      label,
  }
}

export default function BorrowLendPage() {
  const [
    items,
    setItems,
  ] =
    useState<
      RecordItem[]
    >([])

  const [
    open,
    setOpen,
  ] =
    useState(false)

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
    repayId,
    setRepayId,
  ] =
    useState<
      string | null
    >(null)

  const [
    expandedPerson,
    setExpandedPerson,
  ] =
    useState<
      string | null
    >(null)

  const [
    edit,
    setEdit,
  ] =
    useState<
      RecordItem | null
    >(null)

  const [
    toast,
    setToast,
  ] =
    useState<
      ToastState
    >(null)

  const [
    loading,
    setLoading,
  ] =
    useState(true)

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
      RecordItem | null
    >(null)

  const [
    settleTarget,
    setSettleTarget,
  ] =
    useState<
      RecordItem | null
    >(null)

  const [
    settleExpense,
    setSettleExpense,
  ] =
    useState(true)

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
          "/api/borrow-lend",
          {
            cache:
              "no-store",
          }
        )

      if (
        !response.ok
      ) {
        throw new Error()
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
      raw.dueDate &&
      raw.startDate &&
      raw.dueDate <
        raw.startDate
    ) {
      setMessage(
        "Due date cannot be before the start date."
      )

      return
    }

    if (
      !raw.person ||
      !raw.startDate ||
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setMessage(
        "Please complete person, type, amount and date."
      )

      return
    }

    const previous =
      items

    const tempId =
      `temp-${Date.now()}`

    const optimistic:
      RecordItem = {
      id:
        tempId,

      person:
        raw.person,

      phone:
        raw.phone ||
        null,

      type:
        raw.type as
          | "BORROWED"
          | "LENT",

      amount,

      repaid:
        0,

      remaining:
        amount,

      startDate:
        dateInputToIso(
          raw.startDate
        ),

      dueDate:
        raw.dueDate
          ? dateInputToIso(
              raw.dueDate
            )
          : null,

      notes:
        raw.notes ||
        null,

      status:
        "PENDING",

      repayments:
        [],
    }

    setItems(
      (current) => [
        optimistic,
        ...current,
      ]
    )

    form.reset()

    setOpen(false)
    setBusy(true)
    setMessage("")

    try {
      const response =
        await fetch(
          "/api/borrow-lend",
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
            "Could not save record."
        )
      }

      setItems(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              tempId
                ? data
                : item
          )
      )

      say(
        "Borrow/Lend record saved."
      )
    } catch (
      error
    ) {
      setItems(
        previous
      )

      setOpen(true)

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Could not save record."
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

    const raw =
      Object.fromEntries(
        new FormData(
          e.currentTarget
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
      raw.dueDate &&
      raw.startDate &&
      raw.dueDate <
        raw.startDate
    ) {
      say(
        "Due date cannot be before the start date.",
        "error"
      )

      return
    }

    if (
      amount <
      edit.repaid
    ) {
      say(
        "Amount cannot be below the amount already repaid.",
        "error"
      )

      return
    }

    const previous =
      items

    const original =
      edit

    const optimistic:
      RecordItem = {
      ...original,

      person:
        raw.person,

      phone:
        raw.phone ||
        null,

      type:
        raw.type as
          | "BORROWED"
          | "LENT",

      amount,

      remaining:
        Math.max(
          amount -
            original.repaid,
          0
        ),

      startDate:
        dateInputToIso(
          raw.startDate
        ),

      dueDate:
        raw.dueDate
          ? dateInputToIso(
              raw.dueDate
            )
          : null,

      notes:
        raw.notes ||
        null,
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
          `/api/borrow-lend/${original.id}`,
          {
            method:
              "PUT",

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
            "Could not update record"
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
        "Borrow/Lend record updated"
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
          : "Could not update record",

        "error"
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     FULL SETTLEMENT
  ======================================== */

  async function settleFull(
    item: RecordItem,
    createExpense =
      false
  ) {
    setBusy(true)
    setMessage("")

    try {
      const response =
        await fetch(
          `/api/borrow-lend/${item.id}/repay`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  amount:
                    item.remaining,

                  date:
                    new Date()
                      .toISOString()
                      .slice(
                        0,
                        10
                      ),

                  createExpense:
                    item.type ===
                      "BORROWED" &&
                    createExpense,

                  paymentMethod:
                    "UPI",

                  notes:
                    "Full settlement",
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
            "Could not settle record."
        )
      }

      setSettleTarget(
        null
      )

      setMessage(
        item.type ===
          "BORROWED"
          ? "Borrowed amount fully repaid."
          : "Lent amount fully received."
      )

      await load()
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Could not settle record."
      )
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     DELETE
  ======================================== */

  async function remove(
    item: RecordItem
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
          `/api/borrow-lend/${item.id}`,
          {
            method:
              "DELETE",
          }
        )

      if (
        !response.ok
      ) {
        throw new Error(
          "Could not delete record"
        )
      }

      say(
        "Borrow/Lend record deleted"
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
          : "Could not delete record",

        "error"
      )
    }
  }

  /* ========================================
     PARTIAL REPAYMENT
  ======================================== */

  async function repay(
    e: React.FormEvent<HTMLFormElement>,
    item: RecordItem
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
        FormDataEntryValue
      >

    const payment =
      Number(
        raw.amount
      )

    if (
      !Number.isFinite(
        payment
      ) ||
      payment <= 0
    ) {
      setMessage(
        "Enter a valid repayment amount."
      )

      return
    }

    if (
      payment >
      item.remaining
    ) {
      setMessage(
        `Repayment cannot exceed the remaining ${money(
          item.remaining
        )}.`
      )

      return
    }

    const payload = {
      ...raw,

      createExpense:
        raw.createExpense ===
        "on",
    }

    setBusy(true)
    setMessage("")

    try {
      const response =
        await fetch(
          `/api/borrow-lend/${item.id}/repay`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
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
        setMessage(
          data.error ||
            "Could not save repayment."
        )

        return
      }

      form.reset()

      setRepayId(
        null
      )

      say(
        data.settled
          ? "Record fully settled."
          : "Repayment recorded"
      )

      await load()
    } finally {
      setBusy(false)
    }
  }

  /* ========================================
     SUMMARY VALUES
  ======================================== */

  const active =
    items.filter(
      (item) =>
        item.status !==
        "SETTLED"
    )

  const settled =
    items.filter(
      (item) =>
        item.status ===
        "SETTLED"
    )

  const youOwe =
    active
      .filter(
        (item) =>
          item.type ===
          "BORROWED"
      )
      .reduce(
        (sum, item) =>
          sum +
          item.remaining,
        0
      )

  const owedToYou =
    active
      .filter(
        (item) =>
          item.type ===
          "LENT"
      )
      .reduce(
        (sum, item) =>
          sum +
          item.remaining,
        0
      )

  const overdueTotal =
    active
      .filter(
        (item) =>
          dueInfo(
            item
          ).kind ===
          "overdue"
      )
      .reduce(
        (sum, item) =>
          sum +
          item.remaining,
        0
      )

  const settledTotal =
    settled.reduce(
      (sum, item) =>
        sum +
        item.amount,
      0
    )

  /* ========================================
     PERSON HISTORY
  ======================================== */

  const people =
    useMemo(() => {
      const map =
        new Map<
          string,
          RecordItem[]
        >()

      for (
        const item of items
      ) {
        map.set(
          item.person,

          [
            ...(map.get(
              item.person
            ) || []),

            item,
          ]
        )
      }

      return [
        ...map.entries(),
      ].sort(
        (a, b) =>
          a[0].localeCompare(
            b[0]
          )
      )
    }, [items])

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

      {/* BACK */}

      <div className="mb-4">
        <Link
          href="/expenses"
          className="btn btn-secondary"
        >
          <ArrowLeft
            size={16}
          />

          Back to Expenses
        </Link>
      </div>

      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            Personal money
          </p>

          <h2 className="mt-1 text-3xl font-black">
            Borrow & Lend
          </h2>

          <p className="mt-2 text-sm muted">
            Track money you owe
            and money others owe
            you, including partial
            repayments and due
            reminders.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpen(
              (value) =>
                !value
            )
          }
          className="btn btn-primary"
        >
          <Plus
            size={17}
          />

          {open
            ? "Close"
            : "Add record"}
        </button>
      </div>

      {/* SUMMARY */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          title="You owe"
          value={money(
            youOwe
          )}
          icon={
            ArrowUpRight
          }
          tone="rose"
        />

        <Summary
          title="Owed to you"
          value={money(
            owedToYou
          )}
          icon={
            ArrowDownLeft
          }
          tone="emerald"
        />

        <Summary
          title="Overdue"
          value={money(
            overdueTotal
          )}
          icon={
            AlertTriangle
          }
          tone="amber"
        />

        <Summary
          title="Settled history"
          value={money(
            settledTotal
          )}
          icon={
            CheckCircle2
          }
          tone="blue"
        />
      </section>

      {/* ADD FORM */}

      {open && (
        <form
          onSubmit={add}
          className="soft-panel mt-6 grid gap-3 md:grid-cols-2"
        >
          <input
            name="person"
            className="input"
            placeholder="Friend / person name"
            required
          />

          <input
            name="phone"
            className="input"
            placeholder="Phone / contact (optional)"
          />

          <select
            name="type"
            className="input"
            defaultValue="BORROWED"
          >
            <option value="BORROWED">
              I borrowed money
            </option>

            <option value="LENT">
              I lent money
            </option>
          </select>

          <input
            name="amount"
            className="input"
            type="number"
            min="1"
            step="0.01"
            placeholder="Amount ₹"
            required
          />

          <input
            name="startDate"
            className="input"
            type="date"
            required
          />

          <input
            name="dueDate"
            className="input"
            type="date"
          />

          <input
            name="notes"
            className="input md:col-span-2"
            placeholder="Reason / notes (optional)"
          />

          <button
            disabled={busy}
            className="btn btn-primary md:col-span-2"
          >
            {busy
              ? "Saving..."
              : "Save record"}
          </button>
        </form>
      )}

      {/* EDIT FORM */}

      {edit && (
        <form
          onSubmit={
            saveEdit
          }
          className="soft-panel mt-5 grid gap-3 md:grid-cols-2"
        >
          <input
            name="person"
            defaultValue={
              edit.person
            }
            className="input"
            required
          />

          <input
            name="phone"
            defaultValue={
              edit.phone ||
              ""
            }
            className="input"
            placeholder="Phone (optional)"
          />

          <select
            name="type"
            defaultValue={
              edit.type
            }
            className="input"
          >
            <option value="BORROWED">
              I borrowed money
            </option>

            <option value="LENT">
              I lent money
            </option>
          </select>

          <input
            name="amount"
            defaultValue={
              edit.amount
            }
            className="input"
            type="number"
            min={
              edit.repaid ||
              1
            }
            step=".01"
            required
          />

          <input
            name="startDate"
            defaultValue={
              new Date(
                edit.startDate
              )
                .toISOString()
                .slice(
                  0,
                  10
                )
            }
            className="input"
            type="date"
            required
          />

          <input
            name="dueDate"
            defaultValue={
              edit.dueDate
                ? new Date(
                    edit.dueDate
                  )
                    .toISOString()
                    .slice(
                      0,
                      10
                    )
                : ""
            }
            className="input"
            type="date"
          />

          <input
            name="notes"
            defaultValue={
              edit.notes ||
              ""
            }
            className="input md:col-span-2"
            placeholder="Notes"
          />

          <div className="flex gap-2 md:col-span-2">
            <button
              disabled={
                busy
              }
              className="btn btn-primary"
            >
              Update record
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
        <p className="mt-3 text-sm font-semibold accent">
          {message}
        </p>
      )}

      {loadError && (
        <DataErrorState
          title="Unable to load Borrow & Lend"
          onRetry={load}
        />
      )}

      {!loadError &&
        loading && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-64" />
            <div className="skeleton h-64" />
          </div>
        )}

      {/* ACTIVE RECORDS */}

      {!loading &&
        !loadError && (
          <section className="mt-6">
            <div className="flex items-center gap-2">
              <HandCoins
                className="accent"
                size={
                  19
                }
              />

              <h3 className="text-lg font-black">
                Active records
              </h3>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {active.map(
                (item) => {
                  const due =
                    dueInfo(
                      item
                    )

                  return (
                    <div
                      key={
                        item.id
                      }
                      className="borrow-card soft-panel"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-lg font-black">
                              {
                                item.person
                              }
                            </h4>

                            <span
                              className={`borrow-type ${
                                item.type ===
                                "BORROWED"
                                  ? "borrowed"
                                  : "lent"
                              }`}
                            >
                              {item.type ===
                              "BORROWED"
                                ? "You borrowed"
                                : "You lent"}
                            </span>
                          </div>

                          <p className="mt-2 text-2xl font-black">
                            {money(
                              item.remaining
                            )}{" "}
                            <span className="text-xs font-semibold muted">
                              remaining
                            </span>
                          </p>

                          <p className="mt-1 text-xs muted">
                            Original{" "}
                            {money(
                              item.amount
                            )}{" "}
                            ·{" "}
                            {item.repaid >
                            0
                              ? `${money(
                                  item.repaid
                                )} repaid`
                              : "No repayments yet"}
                          </p>

                          {item.phone && (
                            <p className="mt-1 text-xs muted">
                              Contact:{" "}
                              {
                                item.phone
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEdit(
                                item
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-xl accent hover:bg-emerald-500/10"
                            aria-label="Edit record"
                          >
                            <Pencil
                              size={
                                16
                              }
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(
                                item
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-xl text-rose-400 hover:bg-rose-500/10"
                            aria-label="Delete record"
                          >
                            <Trash2
                              size={
                                16
                              }
                            />
                          </button>
                        </div>
                      </div>

                      {/* DUE STATUS */}

                      <div
                        className={`borrow-status borrow-status-${due.kind} mt-4 rounded-2xl border p-3`}
                      >
                        <div className="flex items-start gap-2">
                          <CalendarClock
                            size={
                              17
                            }
                            className="mt-0.5 shrink-0"
                          />

                          <div>
                            <p className="text-sm font-black">
                              {
                                due.label
                              }
                            </p>

                            <p className="mt-1 text-xs">
                              {
                                due.copy
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="mt-3 text-xs leading-5 muted">
                          {
                            item.notes
                          }
                        </p>
                      )}

                      {/* ACTIONS */}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRepayId(
                              repayId ===
                                item.id
                                ? null
                                : item.id
                            )
                          }
                          className="btn btn-primary"
                        >
                          {item.type ===
                          "BORROWED"
                            ? "Add repayment"
                            : "Add received amount"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSettleExpense(
                              true
                            )

                            setSettleTarget(
                              item
                            )
                          }}
                          disabled={
                            busy
                          }
                          className="btn btn-secondary"
                        >
                          <CheckCircle2
                            size={
                              16
                            }
                          />

                          {item.type ===
                          "BORROWED"
                            ? "Mark fully paid"
                            : "Mark fully received"}
                        </button>
                      </div>

                      {/* REPAYMENT FORM */}

                      {repayId ===
                        item.id && (
                        <form
                          onSubmit={(
                            event
                          ) =>
                            repay(
                              event,
                              item
                            )
                          }
                          className="borrow-repay-panel mt-4 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2"
                        >
                          <input
                            name="amount"
                            className="input"
                            type="number"
                            min="0.01"
                            max={
                              item.remaining
                            }
                            step="0.01"
                            placeholder={`Up to ${money(
                              item.remaining
                            )}`}
                            required
                          />

                          <input
                            name="date"
                            className="input"
                            type="date"
                            max={new Date()
                              .toISOString()
                              .slice(
                                0,
                                10
                              )}
                            required
                          />

                          <input
                            name="notes"
                            className="input sm:col-span-2"
                            placeholder="Repayment note (optional)"
                          />

                          {item.type ===
                            "BORROWED" && (
                            <>
                              <select
                                name="paymentMethod"
                                className="input"
                              >
                                <option>
                                  UPI
                                </option>

                                <option>
                                  Card
                                </option>

                                <option>
                                  Cash
                                </option>

                                <option>
                                  Bank Transfer
                                </option>
                              </select>

                              <label
                                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                                style={{
                                  borderColor:
                                    "var(--line)",
                                }}
                              >
                                <input
                                  name="createExpense"
                                  type="checkbox"
                                  defaultChecked
                                />

                                Add this repayment
                                to Expenses
                              </label>
                            </>
                          )}

                          <button
                            disabled={
                              busy
                            }
                            className="btn btn-primary sm:col-span-2"
                          >
                            {busy
                              ? "Saving..."
                              : item.type ===
                                  "BORROWED"
                                ? "Save repayment"
                                : "Save received amount"}
                          </button>
                        </form>
                      )}

                      {/* REPAYMENT HISTORY */}

                      {!!item
                        .repayments
                        .length && (
                        <div
                          className="mt-4 border-t pt-3"
                          style={{
                            borderColor:
                              "var(--line)",
                          }}
                        >
                          <p className="text-xs font-black uppercase tracking-[.14em] muted">
                            Repayment
                            history
                          </p>

                          {item.repayments
                            .slice(
                              0,
                              3
                            )
                            .map(
                              (
                                repayment
                              ) => (
                                <div
                                  key={
                                    repayment.id
                                  }
                                  className="mt-2 flex justify-between text-xs"
                                >
                                  <span className="muted">
                                    {new Date(
                                      repayment.date
                                    ).toLocaleDateString(
                                      "en-IN"
                                    )}
                                  </span>

                                  <b>
                                    {money(
                                      repayment.amount
                                    )}
                                  </b>
                                </div>
                              )
                            )}
                        </div>
                      )}
                    </div>
                  )
                }
              )}

              {!active.length && (
                <div className="empty-state lg:col-span-2">
                  <HandCoins className="mx-auto accent" />

                  <p className="mt-4 font-black">
                    Nothing pending
                  </p>

                  <p className="mt-2 text-sm muted">
                    Add money you
                    borrowed or lent
                    to start tracking
                    it.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

      {/* PERSON-WISE HISTORY */}

      {!loading &&
        !loadError && (
          <section className="soft-panel mt-6">
            <div className="flex items-center gap-2">
              <History
                size={
                  18
                }
                className="accent"
              />

              <h3 className="font-black">
                Person-wise
                history
              </h3>
            </div>

            <div className="mt-4 space-y-2">
              {people.map(
                ([
                  person,
                  records,
                ]) => {
                  const owe =
                    records
                      .filter(
                        (
                          item
                        ) =>
                          item.type ===
                            "BORROWED" &&
                          item.status !==
                            "SETTLED"
                      )
                      .reduce(
                        (
                          sum,
                          item
                        ) =>
                          sum +
                          item.remaining,
                        0
                      )

                  const owed =
                    records
                      .filter(
                        (
                          item
                        ) =>
                          item.type ===
                            "LENT" &&
                          item.status !==
                            "SETTLED"
                      )
                      .reduce(
                        (
                          sum,
                          item
                        ) =>
                          sum +
                          item.remaining,
                        0
                      )

                  const isOpen =
                    expandedPerson ===
                    person

                  return (
                    <div
                      key={
                        person
                      }
                      className="rounded-2xl border p-3"
                      style={{
                        borderColor:
                          "var(--line)",
                        background:
                          "var(--secondary)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPerson(
                            isOpen
                              ? null
                              : person
                          )
                        }
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 accent">
                          <UserRound
                            size={
                              18
                            }
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-black">
                            {
                              person
                            }
                          </p>

                          <p className="mt-1 text-xs muted">
                            You owe{" "}
                            {money(
                              owe
                            )}{" "}
                            · Owed to
                            you{" "}
                            {money(
                              owed
                            )}{" "}
                            ·{" "}
                            {
                              records.length
                            }{" "}
                            record
                            {records.length ===
                            1
                              ? ""
                              : "s"}
                          </p>
                        </div>

                        {isOpen ? (
                          <ChevronUp
                            size={
                              17
                            }
                          />
                        ) : (
                          <ChevronDown
                            size={
                              17
                            }
                          />
                        )}
                      </button>

                      {isOpen && (
                        <div
                          className="mt-3 space-y-2 border-t pt-3"
                          style={{
                            borderColor:
                              "var(--line)",
                          }}
                        >
                          {records.map(
                            (
                              record
                            ) => (
                              <div
                                key={
                                  record.id
                                }
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2 text-sm"
                              >
                                <div>
                                  <b>
                                    {record.type ===
                                    "BORROWED"
                                      ? "Borrowed"
                                      : "Lent"}{" "}
                                    {money(
                                      record.amount
                                    )}
                                  </b>

                                  <p className="mt-1 text-xs muted">
                                    {new Date(
                                      record.startDate
                                    ).toLocaleDateString(
                                      "en-IN"
                                    )}{" "}
                                    ·{" "}
                                    {record.status ===
                                    "SETTLED"
                                      ? "Settled"
                                      : `${money(
                                          record.remaining
                                        )} pending`}
                                  </p>
                                </div>

                                <span
                                  className={
                                    record.status ===
                                    "SETTLED"
                                      ? "text-emerald-400"
                                      : "muted"
                                  }
                                >
                                  {record.status ===
                                  "PARTIAL"
                                    ? "Partially paid"
                                    : record.status.charAt(
                                        0
                                      ) +
                                      record.status
                                        .slice(
                                          1
                                        )
                                        .toLowerCase()}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                }
              )}

              {!people.length && (
                <p className="py-6 text-center text-sm muted">
                  No person
                  history yet.
                </p>
              )}
            </div>
          </section>
        )}

      {/* DELETE MODAL */}

      <ConfirmModal
        open={
          !!deleteTarget
        }
        title="Delete Borrow & Lend record?"
        message="This will permanently delete the record and its repayment history."
        confirmLabel="Delete record"
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

      {/* SETTLE MODAL */}

      {settleTarget && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4">
          <div className="modal-panel w-full max-w-md rounded-3xl border p-6">
            <h3 className="text-xl font-black">
              {settleTarget.type ===
              "BORROWED"
                ? "Mark fully paid?"
                : "Mark fully received?"}
            </h3>

            <p className="mt-3 text-sm muted">
              Settle the
              remaining{" "}
              {money(
                settleTarget.remaining
              )}{" "}
              {settleTarget.type ===
              "BORROWED"
                ? `owed to ${settleTarget.person}`
                : `from ${settleTarget.person}`}
              .
            </p>

            {settleTarget.type ===
              "BORROWED" && (
              <label
                className="mt-5 flex items-center gap-3 rounded-xl border p-3 text-sm"
                style={{
                  borderColor:
                    "var(--line)",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    settleExpense
                  }
                  onChange={(
                    e
                  ) =>
                    setSettleExpense(
                      e.target
                        .checked
                    )
                  }
                />

                Also add this
                repayment to
                Expenses
              </label>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setSettleTarget(
                    null
                  )
                }
                disabled={
                  busy
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  busy
                }
                onClick={() =>
                  settleFull(
                    settleTarget,
                    settleExpense
                  )
                }
              >
                {busy
                  ? "Saving..."
                  : "Confirm settlement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function Summary({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  icon: typeof HandCoins
  tone: string
}) {
  return (
    <div
      className={`borrow-summary borrow-summary-${tone} stat-card`}
    >
      <div className="flex items-center justify-between">
        <span className="metric-label">
          {title}
        </span>

        <Icon
          size={18}
        />
      </div>

      <p className="mt-4 text-2xl font-black">
        {value}
      </p>
    </div>
  )
}