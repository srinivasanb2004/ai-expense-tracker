"use client"

import AppShell from "@/components/app-shell"
import DataErrorState from "@/components/data-error-state"
import { CalendarDays, IndianRupee, PiggyBank, ReceiptText, TrendingUp } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type AnalyticsData = {
  totals: { spending: number; income: number; savings: number; transactions: number }
  monthly: { name: string; spending: number; income: number; savings: number; value: number }[]
  category: { name: string; value: number }[]
  merchants: { name: string; value: number }[]
  highestSpendDay: { date: string; amount: number } | null
}

const pieColors = ["#34d399", "#22c55e", "#14b8a6", "#60a5fa", "#a78bfa", "#f59e0b", "#fb7185", "#94a3b8"]

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0)
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [range, setRange] = useState("month")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  const query = useMemo(() => {
    const params = new URLSearchParams({ range })
    if (range === "custom" && from && to) {
      params.set("from", from)
      params.set("to", to)
    }
    return params.toString()
  }, [range, from, to])

  useEffect(() => {
    if (range === "custom" && (!from || !to)) return
    let active = true
    setLoading(true)
    setError("")

    fetch(`/api/analytics?${query}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || "Could not load analytics.")
        if (active) setData(payload)
      })
      .catch((err) => active && setError(err.message || "Could not load analytics."))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [query, range, from, to, reloadKey])

  const cards = data
    ? [
        ["Total spending", money(data.totals.spending), IndianRupee],
        ["Total income", money(data.totals.income), TrendingUp],
        [data.totals.savings < 0 ? "Net overspend" : "Net savings", money(Math.abs(data.totals.savings)), PiggyBank],
        ["Transactions", String(data.totals.transactions), ReceiptText],
      ]
    : []

  return (
    <AppShell>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Money intelligence</p>
          <h2 className="mt-2 text-3xl font-black">Advanced Analytics</h2>
          <p className="mt-2 muted">Explore spending, income, savings, categories and merchants for any period.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ["month", "This month"],
            ["lastMonth", "Last month"],
            ["3months", "Last 3 months"],
            ["custom", "Custom range"],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setRange(value)} className={`btn ${range === value ? "btn-primary" : "btn-secondary"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" && (
        <div className="soft-panel mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-xs font-bold uppercase tracking-wider muted">From</span>
            <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider muted">To</span>
            <input type="date" className="input mt-1" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}

      {error && <DataErrorState title="Unable to load analytics" message={error} onRetry={() => setReloadKey((value) => value + 1)} />}
      {loading && <div className="mt-5 space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((x)=><div key={x} className="skeleton h-28" />)}</div><div className="grid gap-5 xl:grid-cols-2"><div className="skeleton h-[360px]"/><div className="skeleton h-[360px]"/></div></div>}

      {data && !loading && (
        <>
          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value, Icon]: any) => (
              <div key={label} className="stat-card">
                <div className="flex items-center justify-between">
                  <span className="metric-label">{label}</span>
                  <Icon size={18} className="accent" />
                </div>
                <p className="mt-4 text-2xl font-black">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="soft-panel h-[360px]">
              <h3 className="font-black">Monthly spending trend</h3>
              <p className="mt-1 text-sm muted">Expense movement across the selected period.</p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthly}>
                    <defs>
                      <linearGradient id="spendingFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} />
                    <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => money(Number(value))} />
                    <Area type="monotone" dataKey="spending" stroke="#34d399" strokeWidth={3} fill="url(#spendingFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="soft-panel h-[360px]">
              <h3 className="font-black">Category donut</h3>
              <p className="mt-1 text-sm muted">Where your money went.</p>
              <div className="mt-3 h-[285px]">
                {data.category.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.category} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
                        {data.category.map((entry, index) => <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => money(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center muted">No category data for this period.</div>
                )}
              </div>
            </div>

            <div className="soft-panel h-[360px]">
              <h3 className="font-black">Income vs expense</h3>
              <p className="mt-1 text-sm muted">Compare money in and money out.</p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} />
                    <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => money(Number(value))} />
                    <Legend />
                    <Bar dataKey="income" fill="#34d399" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="spending" fill="#fb7185" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="soft-panel h-[360px]">
              <h3 className="font-black">Savings trend</h3>
              <p className="mt-1 text-sm muted">Income minus expenses over time.</p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} />
                    <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => money(Number(value))} />
                    <Area type="monotone" dataKey="savings" stroke="#60a5fa" strokeWidth={3} fill="#60a5fa" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
            <div className="insight-card">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} />
                <p className="text-xs font-black uppercase tracking-[0.16em]">Highest-spend day</p>
              </div>
              {data.highestSpendDay ? (
                <>
                  <p className="mt-5 text-3xl font-black">{money(data.highestSpendDay.amount)}</p>
                  <p className="mt-2 text-sm opacity-80">
                    {new Date(`${data.highestSpendDay.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </>
              ) : (
                <p className="mt-5 muted">No expense activity in this period.</p>
              )}
            </div>

            <div className="soft-panel h-[330px]">
              <h3 className="font-black">Top merchants</h3>
              <p className="mt-1 text-sm muted">Businesses and services receiving most of your spend.</p>
              <div className="mt-4 h-[250px]">
                {data.merchants.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.merchants} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fill: "currentColor", fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => money(Number(value))} />
                      <Bar dataKey="value" fill="#34d399" radius={[0, 7, 7, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center muted">No merchant data for this period.</div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  )
}
