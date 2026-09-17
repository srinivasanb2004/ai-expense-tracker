import AppShell from "@/components/app-shell"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Target,
  Sparkles,
  ArrowRight,
  ReceiptText,
  Plus,
  ScanLine,
  HandCoins,
  WifiOff,
  RefreshCw,
} from "lucide-react"
import Greeting from "@/components/greeting"
import Link from "next/link"
import { Prisma } from "@prisma/client"
import { Suspense } from "react"

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return value ? Number(value) : 0
}

type CategoryTotal = {
  category: string
  amount: Prisma.Decimal | number | string | null
}

type DashboardSummaryRow = {
  income: Prisma.Decimal | number | string | null
  budget: Prisma.Decimal | number | string | null
  categories: unknown
}

function normalizeCategoryTotals(value: unknown): CategoryTotal[] {
  const categories = typeof value === "string" ? JSON.parse(value) : value

  if (!Array.isArray(categories)) return []

  return categories.flatMap((item) => {
    if (!item || typeof item !== "object") return []

    const category = (item as { category?: unknown }).category

    if (typeof category !== "string") return []

    return [{
      category,
      amount: (item as { amount?: Prisma.Decimal | number | string | null }).amount ?? null,
    }]
  })
}

export default async function Dashboard() {
  const session = await auth()

  const userId = (session?.user as any)?.id as
    | string
    | undefined

  if (!userId) return null

  const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  return <AppShell>
    <div>
      <p className="eyebrow">{month}</p>
      <h2 className="text-3xl font-black"><Greeting name={session?.user?.name} /></h2>
      <p className="mt-2 text-sm muted">Here&apos;s how your money is moving this month.</p>
    </div>
    <section className="mt-5 flex flex-wrap gap-2" aria-label="Quick actions">
      <Link href="/expenses?new=1" className="btn btn-primary"><Plus size={16} />Add expense</Link>
      <Link href="/income" className="btn btn-secondary"><ArrowUpRight size={16} />Add income</Link>
      <Link href="/borrow-lend" className="btn btn-secondary"><HandCoins size={16} />Borrow/Lend</Link>
      <Link href="/scan" className="btn btn-secondary"><ScanLine size={16} />Scan receipt</Link>
    </section>
    <Suspense fallback={<DashboardContentSkeleton />}>
      <DashboardContent userId={userId} />
    </Suspense>
  </AppShell>
}

function DashboardContentSkeleton() {
  return <div role="status" aria-label="Loading dashboard data" className="space-y-5 pt-6">
    <div className="skeleton h-56 rounded-[30px]" />
    <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-28" />)}</div>
    <div className="grid gap-4 sm:grid-cols-2">{[1, 2].map((item) => <div key={item} className="skeleton h-28" />)}</div>
    <div className="grid gap-5 xl:grid-cols-2"><div className="skeleton h-80" /><div className="skeleton h-80" /></div>
  </div>
}

async function DashboardContent({ userId }: { userId: string }) {

  const now = new Date()

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  )

  let summary: DashboardSummaryRow | undefined
  // Start independent sections immediately. Their Suspense boundaries let
  // each section appear as soon as its own database work completes.
  const recentPromise = prisma.expense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 6,
    select: { id: true, merchant: true, category: true, amount: true, date: true },
  })
  const borrowPromise = Promise.all([
    prisma.borrowLend.findMany({
      where: { userId, status: { not: "SETTLED" } },
      select: { id: true, type: true, amount: true },
    }),
    prisma.borrowLendRepayment.groupBy({
      by: ["borrowLendId"],
      where: { borrowLend: { userId, status: { not: "SETTLED" } } },
      _sum: { amount: true },
    }),
  ])

  try {
    ;[summary] = await prisma.$queryRaw<DashboardSummaryRow[]>`
      SELECT
        COALESCE((
          SELECT SUM("amount")
          FROM "Income"
          WHERE "userId" = ${userId}
            AND "date" >= ${start}
            AND "date" < ${end}
        ), 0) AS "income",
        COALESCE((
          SELECT SUM("amount")
          FROM "Budget"
          WHERE "userId" = ${userId}
            AND "month" = ${now.getMonth() + 1}
            AND "year" = ${now.getFullYear()}
        ), 0) AS "budget",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'category', "category",
              'amount', "amount"
            )
            ORDER BY "amount" DESC
          )
          FROM (
            SELECT "category", SUM("amount") AS "amount"
            FROM "Expense"
            WHERE "userId" = ${userId}
              AND "date" >= ${start}
              AND "date" < ${end}
            GROUP BY "category"
          ) AS "category_totals"
        ), '[]'::json) AS "categories"
    `
  } catch (error) {
    console.error(
      "Dashboard database connection error:",
      error
    )

    return (
      <>
        <div className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center">
          <div className="soft-panel w-full text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400">
              <WifiOff size={30} />
            </div>

            <p className="eyebrow mt-6">
              Connection problem
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Unable to load your dashboard
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 muted">
              We couldn&apos;t connect to your financial
              database. Check your internet connection
              and try again.
            </p>

            <Link
              href="/dashboard"
              className="btn btn-primary mt-6"
            >
              <RefreshCw size={17} />
              Try Again
            </Link>

            <p className="mt-4 text-xs muted">
              Your existing financial data is safe.
            </p>
          </div>
        </div>
      </>
    )
  }

  const categoryTotals = normalizeCategoryTotals(summary?.categories)

  const spent = categoryTotals.reduce(
    (total, category) => total + decimalToNumber(category.amount),
    0
  )

  const income = decimalToNumber(
    summary?.income
  )

  const remaining = income - spent

  const budget = decimalToNumber(
    summary?.budget
  )

  const budgetUsed =
    budget > 0
      ? Math.min((spent / budget) * 100, 100)
      : 0

  const topCategory = categoryTotals[0]
  const top = topCategory
    ? [
        topCategory.category,
        decimalToNumber(topCategory.amount),
      ] as const
    : null

  return (
    <>
      {/* BALANCE HERO */}

      <section className="hero-card mt-6">
        <div className="relative z-10 grid gap-7 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <p className="text-sm font-bold text-emerald-950/70">
              Available balance
            </p>

            <p className="mt-3 text-4xl font-black tracking-tight text-emerald-950 sm:text-6xl">
              {money(Math.max(remaining, 0))}
            </p>

            <p className="mt-4 text-sm font-bold text-emerald-950/70">
              {income === 0
                ? "Add income to track your balance"
                : remaining < 0
                  ? `${money(
                      Math.abs(remaining)
                    )} overspent`
                  : `${money(
                      remaining
                    )} left after expenses`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="hero-mini-card">
              <p>Income</p>
              <strong>
                {money(income)}
              </strong>
            </div>

            <div className="hero-mini-card">
              <p>Spent</p>
              <strong>
                {money(spent)}
              </strong>
            </div>

            <div className="hero-mini-card">
              <p>Budget</p>
              <strong>
                {budgetUsed.toFixed(0)}%
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          [
            "Income",
            money(income),
            ArrowUpRight,
          ],
          [
            "Spent",
            money(spent),
            ArrowDownRight,
          ],
          [
            remaining < 0
              ? "Overspent"
              : "Remaining",
            money(Math.abs(remaining)),
            Wallet,
          ],
        ].map(
          ([label, value, Icon]: any) => (
            <div
              key={label}
              className="stat-card"
            >
              <div className="flex items-center justify-between">
                <span className="metric-label">
                  {label}
                </span>

                <Icon
                  size={18}
                  className="accent"
                />
              </div>

              <p
                className={`mt-5 text-2xl font-black ${
                  label === "Overspent"
                    ? "text-red-400"
                    : ""
                }`}
              >
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <Suspense fallback={<div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="skeleton h-28" /><div className="skeleton h-28" /></div>}>
        <BorrowCards data={borrowPromise} />
      </Suspense>

      {/* ACTIVITY + BUDGET */}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <div className="soft-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">
                Activity
              </p>

              <h3 className="mt-1 text-lg font-black">
                Recent transactions
              </h3>
            </div>

            <Link
              href="/expenses"
              className="view-link"
            >
              View all
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-5 space-y-1">
            <Suspense fallback={[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-14" />)}>
              <ActivityRows data={recentPromise} />
            </Suspense>
          </div>
        </div>

        <div className="grid gap-5">
          {/* BUDGET */}

          <div className="soft-panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">
                  Budget
                </p>

                <h3 className="mt-1 font-black">
                  Monthly Budget Overview
                </h3>
              </div>

              <Target className="accent" />
            </div>

            <div className="progress-track mt-6">
              <div
                className="progress-value"
                style={{
                  width: `${budgetUsed}%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs muted">
              <span>
                {money(spent)} spent
              </span>

              <span>
                {budget
                  ? `${money(
                      budget
                    )} total limit`
                  : "No budget set"}
              </span>
            </div>
          </div>

          {/* SMART INSIGHT */}

          <div className="insight-card">
            <div className="flex items-center gap-2">
              <Sparkles size={17} />

              <p className="text-xs font-black uppercase tracking-[.16em]">
                Smart insight
              </p>
            </div>

            <h3 className="mt-5 text-xl font-black">
              {top
                ? `${top[0]} leads your spending.`
                : "No spending insights yet."}
            </h3>

            <p className="mt-3 text-sm leading-6 opacity-80">
              {top
                ? `You spent ${money(
                    top[1]
                  )} on ${top[0]} this month.`
                : "Add expenses to unlock useful financial insights."}
            </p>

            <Link
              href="/analytics"
              className="mt-5 inline-flex items-center gap-2 text-sm font-black"
            >
              View analytics
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

type RecentExpense = {
  id: string
  merchant: string
  category: string
  amount: Prisma.Decimal
  date: Date
}

async function ActivityRows({ data }: { data: Promise<RecentExpense[]> }) {
  try {
    const recent = await data
    if (!recent.length) {
      return <div className="empty-state"><ReceiptText className="mx-auto accent" /><p className="mt-4 font-bold">No transactions yet</p><p className="mt-2 text-sm muted">Add your first expense to see it here.</p></div>
    }
    return <>{recent.map((item) => <div key={item.id} className="transaction-row">
      <div className="transaction-icon"><ReceiptText size={17} /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.merchant}</p><p className="mt-1 text-xs muted">{item.category} · {item.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p></div>
      <p className="text-sm font-black">-{money(Number(item.amount))}</p>
    </div>)}</>
  } catch (error) {
    console.error("Dashboard recent transactions error:", error)
    return <p className="text-sm muted">Recent transactions could not be loaded.</p>
  }
}

type BorrowData = [
  { id: string; type: string; amount: Prisma.Decimal }[],
  { borrowLendId: string; _sum: { amount: Prisma.Decimal | null } }[],
]

async function BorrowCards({ data }: { data: Promise<BorrowData> }) {
  try {
    const [records, repayments] = await data
    const repaymentByRecord = new Map(repayments.map((item) => [item.borrowLendId, decimalToNumber(item._sum.amount)]))
    const totals = records.reduce((result, item) => {
      const remaining = Math.max(Number(item.amount) - (repaymentByRecord.get(item.id) || 0), 0)
      if (item.type === "BORROWED") result.youOwe += remaining
      if (item.type === "LENT") result.owedToYou += remaining
      return result
    }, { youOwe: 0, owedToYou: 0 })
    return <section className="mt-5 grid gap-4 sm:grid-cols-2">
      <Link href="/borrow-lend" className="stat-card block transition hover:-translate-y-0.5"><div className="flex items-center justify-between"><span className="metric-label">You owe</span><ArrowUpRight size={18} className="text-rose-400" /></div><p className="mt-4 text-2xl font-black">{money(totals.youOwe)}</p><p className="mt-1 text-xs muted">Outstanding borrowed money</p></Link>
      <Link href="/borrow-lend" className="stat-card block transition hover:-translate-y-0.5"><div className="flex items-center justify-between"><span className="metric-label">Owed to you</span><ArrowDownRight size={18} className="accent" /></div><p className="mt-4 text-2xl font-black">{money(totals.owedToYou)}</p><p className="mt-1 text-xs muted">Outstanding money you lent</p></Link>
    </section>
  } catch (error) {
    console.error("Dashboard borrow and lend error:", error)
    return <p className="mt-5 text-sm muted">Borrow and lend totals could not be loaded.</p>
  }
}
