import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function monthKey(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
}

export async function GET() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const label = monthKey(now)
  const title = `${label} summary ready`

  const [expenses, incomes, existing] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    prisma.income.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    prisma.notification.findFirst({ where: { userId, title } }),
  ])

  if (!existing && (expenses.length > 0 || incomes.length > 0)) {
    const spent = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
    const income = incomes.reduce((sum, item) => sum + Number(item.amount), 0)
    const balance = income - spent
    await prisma.notification.create({
      data: {
        userId,
        title,
        body: `You spent ₹${spent.toLocaleString("en-IN")} and recorded ₹${income.toLocaleString("en-IN")} income. ${balance >= 0 ? `₹${balance.toLocaleString("en-IN")} remains.` : `You are ₹${Math.abs(balance).toLocaleString("en-IN")} over income.`}`,
      },
    })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return NextResponse.json({
    notifications,
    unread: notifications.filter((item) => !item.read).length,
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body.id) {
    await prisma.notification.updateMany({ where: { id: String(body.id), userId }, data: { read: true } })
  } else {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  }
  return NextResponse.json({ success: true })
}
