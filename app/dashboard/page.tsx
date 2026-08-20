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

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function Dashboard() {
  const session = await auth()

  const userId = (session?.user as any)?.id as
    | string
    | undefined

  if (!userId) return null

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

  const month = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })

  let expenses: any[] = []
  let incomes: any[] = []
  let budgets: any[] = []
  let recent: any[] = []

  try {
    ;[expenses, incomes, budgets, recent] =
      await Promise.all([
        prisma.expense.findMany({
          where: {
            userId,
            date: {
              gte: start,
              lt: end,
            },
          },
        }),

        prisma.income.findMany({
          where: {
            userId,
            date: {
              gte: start,
              lt: end,
            },
          },
        }),

        prisma.budget.findMany({
          where: {
            userId,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          },
        }),

        prisma.expense.findMany({
          where: {
            userId,
          },
          orderBy: {
            date: "desc",
          },
          take: 6,
        }),
      ])
  } catch (error) {
    console.error(
      "Dashboard database connection error:",
      error
    )

    return (
      <AppShell>
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

            <a
              href="/dashboard"
              className="btn btn-primary mt-6"
            >
              <RefreshCw size={17} />
              Try Again
            </a>

            <p className="mt-4 text-xs muted">
              Your existing financial data is safe.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  const spent = expenses.reduce(
    (sum, item) =>
      sum + Number(item.amount),
    0
  )

  const income = incomes.reduce(
    (sum, item) =>
      sum + Number(item.amount),
    0
  )

  const remaining = income - spent

  const budget = budgets.reduce(
    (sum, item) =>
      sum + Number(item.amount),
    0
  )

  const budgetUsed =
    budget > 0
      ? Math.min((spent / budget) * 100, 100)
      : 0

  const cats: Record<string, number> = {}

  expenses.forEach((item) => {
    cats[item.category] =
      (cats[item.category] || 0) +
      Number(item.amount)
  })

  const top = Object.entries(cats).sort(
    (a, b) => b[1] - a[1]
  )[0]

  return (
    <AppShell>
      <div>
        <p className="eyebrow">
          {month}
        </p>

        <h2 className="text-3xl font-black">
          <Greeting
            name={session?.user?.name}
          />
        </h2>

        <p className="mt-2 text-sm muted">
          Here&apos;s how your money is moving this
          month.
        </p>
      </div>

      {/* QUICK ACTIONS */}

      <section
        className="mt-5 flex flex-wrap gap-2"
        aria-label="Quick actions"
      >
        <a
          href="/expenses?new=1"
          className="btn btn-primary"
        >
          <Plus size={16} />
          Add expense
        </a>

        <a
          href="/income"
          className="btn btn-secondary"
        >
          <ArrowUpRight size={16} />
          Add income
        </a>

        <a
          href="/borrow-lend"
          className="btn btn-secondary"
        >
          <HandCoins size={16} />
          Borrow/Lend
        </a>

        <a
          href="/scan"
          className="btn btn-secondary"
        >
          <ScanLine size={16} />
          Scan receipt
        </a>
      </section>

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

            <a
              href="/expenses"
              className="view-link"
            >
              View all
              <ArrowRight size={15} />
            </a>
          </div>

          <div className="mt-5 space-y-1">
            {recent.length ? (
              recent.map((item) => (
                <div
                  key={item.id}
                  className="transaction-row"
                >
                  <div className="transaction-icon">
                    <ReceiptText size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {item.merchant}
                    </p>

                    <p className="mt-1 text-xs muted">
                      {item.category} ·{" "}
                      {item.date.toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                        }
                      )}
                    </p>
                  </div>

                  <p className="text-sm font-black">
                    -
                    {money(
                      Number(item.amount)
                    )}
                  </p>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <ReceiptText className="mx-auto accent" />

                <p className="mt-4 font-bold">
                  No transactions yet
                </p>

                <p className="mt-2 text-sm muted">
                  Add your first expense to see it
                  here.
                </p>
              </div>
            )}
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

            <a
              href="/analytics"
              className="mt-5 inline-flex items-center gap-2 text-sm font-black"
            >
              View analytics
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>
    </AppShell>
  )
}