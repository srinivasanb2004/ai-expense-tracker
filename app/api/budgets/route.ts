import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { after, NextResponse } from "next/server"
import { syncBudgetNotifications } from "@/lib/notifications"

async function getUserId() {
  const session = await auth()
  return (session?.user as any)?.id as string | undefined
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({ where: { userId, month, year }, orderBy: { category: "asc" } }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
      },
    }),
  ])

  return NextResponse.json(
    budgets.map((budget) => {
      const amount = Number(budget.amount)
      const spent = expenses
        .filter((expense) => expense.category === budget.category)
        .reduce((total, expense) => total + Number(expense.amount), 0)
      return { id: budget.id, category: budget.category, amount, spent, remaining: amount - spent }
    })
  )
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const amount = Number(body.amount)
    if (!body.category || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Category and a valid amount are required." }, { status: 400 })
    }

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const budget = await prisma.budget.upsert({
      where: { userId_category_month_year: { userId, category: String(body.category), month, year } },
      update: { amount },
      create: { userId, category: String(body.category), amount, month, year },
    })

    after(() => syncBudgetNotifications(userId).catch((error) => console.error("Budget notification sync error:", error)))
    return NextResponse.json({ ...budget, amount: Number(budget.amount) })
  } catch (error) {
    console.error("Budget save error:", error)
    return NextResponse.json({ error: "Failed to save budget." }, { status: 500 })
  }
}
