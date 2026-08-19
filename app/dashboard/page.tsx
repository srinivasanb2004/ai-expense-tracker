import AppShell from "@/components/app-shell"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ArrowDownRight, ArrowUpRight, Wallet, Target, Sparkles, ArrowRight, ReceiptText } from "lucide-react"
import Greeting from "@/components/greeting"
function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
}

export default async function Dashboard() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return null

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const [expenses, incomes, budgets, recent] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    prisma.income.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    prisma.budget.findMany({ where: { userId, month: now.getMonth() + 1, year: now.getFullYear() } }),
    prisma.expense.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 6 }),
  ])

  const spent = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const income = incomes.reduce((s, x) => s + Number(x.amount), 0)
  const remaining = income - spent
  const budget = budgets.reduce((s, x) => s + Number(x.amount), 0)
  const budgetUsed = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const cats: Record<string, number> = {}
  expenses.forEach((x) => (cats[x.category] = (cats[x.category] || 0) + Number(x.amount)))
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]
  const month = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })


  return (
    <AppShell>
      <div><p className="eyebrow">{month}</p>
        <h2 className="text-3xl font-black">
          <Greeting name={session?.user?.name} />
        </h2>
        <p className="mt-2 text-sm muted">Here&apos;s how your money is moving this month.</p></div>

      <section className="hero-card mt-6">
        <div className="relative z-10 grid gap-7 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div><p className="text-sm font-bold text-emerald-950/70">Available balance</p><p className="mt-3 text-4xl font-black tracking-tight text-emerald-950 sm:text-6xl">{money(Math.max(remaining, 0))}</p><p className="mt-4 text-sm font-bold text-emerald-950/70">{income === 0 ? "Add income to track your balance" : remaining < 0 ? `${money(Math.abs(remaining))} overspent` : `${money(remaining)} left after expenses`}</p></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="hero-mini-card"><p>Income</p><strong>{money(income)}</strong></div>
            <div className="hero-mini-card"><p>Spent</p><strong>{money(spent)}</strong></div>
            <div className="hero-mini-card"><p>Budget</p><strong>{budgetUsed.toFixed(0)}%</strong></div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          ["Income", money(income), ArrowUpRight],
          ["Spent", money(spent), ArrowDownRight],
          [remaining < 0 ? "Overspent" : "Remaining", money(Math.abs(remaining)), Wallet],
        ].map(([label, value, Icon]: any) => <div key={label} className="stat-card"><div className="flex items-center justify-between"><span className="metric-label">{label}</span><Icon size={18} className="accent" /></div><p className={`mt-5 text-2xl font-black ${label === "Overspent" ? "text-red-400" : ""}`}>{value}</p></div>)}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <div className="soft-panel"><div className="flex items-center justify-between"><div><p className="eyebrow">Activity</p><h3 className="mt-1 text-lg font-black">Recent transactions</h3></div><a href="/expenses" className="view-link">View all <ArrowRight size={15} /></a></div>
          <div className="mt-5 space-y-1">{recent.length ? recent.map((x) => <div key={x.id} className="transaction-row"><div className="transaction-icon"><ReceiptText size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{x.merchant}</p><p className="mt-1 text-xs muted">{x.category} · {x.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p></div><p className="text-sm font-black">-{money(Number(x.amount))}</p></div>) : <div className="empty-state"><ReceiptText className="mx-auto accent" /><p className="mt-4 font-bold">No transactions yet</p><p className="mt-2 text-sm muted">Add your first expense to see it here.</p></div>}</div>
        </div>

        <div className="grid gap-5">
          <div className="soft-panel"><div className="flex items-center justify-between"><div><p className="eyebrow">Budget</p><h3 className="mt-1 font-black">Monthly Budget Overview</h3></div><Target className="accent" /></div><div className="progress-track mt-6"><div className="progress-value" style={{ width: `${budgetUsed}%` }} /></div><div className="mt-3 flex justify-between text-xs muted"><span>{money(spent)} spent</span>
          <span>
            {budget ? `${money(budget)} total limit` : "No budget set"}
          </span></div>
          </div>
          <div className="insight-card"><div className="flex items-center gap-2"><Sparkles size={17} /><p className="text-xs font-black uppercase tracking-[.16em]">Smart insight</p></div><h3 className="mt-5 text-xl font-black">{top ? `${top[0]} leads your spending.` : "No spending insights yet."}</h3><p className="mt-3 text-sm leading-6 opacity-80">{top ? `You spent ${money(top[1])} on ${top[0]} this month.` : "Add expenses to unlock useful financial insights."}</p><a href="/analytics" className="mt-5 inline-flex items-center gap-2 text-sm font-black">View analytics <ArrowRight size={15} /></a></div>
        </div>
      </section>
    </AppShell>
  )
}
