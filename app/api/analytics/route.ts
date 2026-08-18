import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endExclusive(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

function resolveRange(url: URL) {
  const range = url.searchParams.get("range") || "month"
  const now = new Date()

  if (range === "lastMonth") {
    return {
      range,
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 1),
    }
  }

  if (range === "3months") {
    return {
      range,
      start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }
  }

  if (range === "custom") {
    const from = url.searchParams.get("from")
    const to = url.searchParams.get("to")
    if (from && to) {
      const start = startOfDay(new Date(`${from}T00:00:00`))
      const end = endExclusive(new Date(`${to}T00:00:00`))
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end) {
        return { range, start, end }
      }
    }
  }

  return {
    range: "month",
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  }
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
}

export async function GET(req: Request) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { range, start, end } = resolveRange(new URL(req.url))

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
    prisma.income.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
  ])

  const category: Record<string, number> = {}
  const merchants: Record<string, number> = {}
  const days: Record<string, number> = {}
  const months = new Map<string, { name: string; spending: number; income: number; savings: number; order: number }>()

  const ensureMonth = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (!months.has(key)) {
      months.set(key, { name: monthLabel(date), spending: 0, income: 0, savings: 0, order: date.getFullYear() * 12 + date.getMonth() })
    }
    return months.get(key)!
  }

  for (const expense of expenses) {
    const amount = Number(expense.amount)
    category[expense.category] = (category[expense.category] || 0) + amount
    merchants[expense.merchant] = (merchants[expense.merchant] || 0) + amount
    const day = expense.date.toISOString().slice(0, 10)
    days[day] = (days[day] || 0) + amount
    ensureMonth(expense.date).spending += amount
  }

  for (const income of incomes) {
    ensureMonth(income.date).income += Number(income.amount)
  }

  const monthly = [...months.values()]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      name: item.name,
      spending: item.spending,
      income: item.income,
      savings: item.income - item.spending,
      value: item.spending,
    }))

  const totalSpending = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0)
  const highestDayEntry = Object.entries(days).sort((a, b) => b[1] - a[1])[0]

  return NextResponse.json({
    range,
    from: start.toISOString(),
    to: end.toISOString(),
    totals: {
      spending: totalSpending,
      income: totalIncome,
      savings: totalIncome - totalSpending,
      transactions: expenses.length,
    },
    monthly,
    category: Object.entries(category).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
    merchants: Object.entries(merchants).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })),
    highestSpendDay: highestDayEntry
      ? { date: highestDayEntry[0], amount: highestDayEntry[1] }
      : null,
  })
}
