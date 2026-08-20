import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createIncomeAddedNotification, syncAllNotifications } from "@/lib/notifications"
import { after, NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()
  return (session?.user as any)?.id as string | undefined
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const incomes = await prisma.income.findMany({ where: { userId }, orderBy: { date: "desc" } })
  return NextResponse.json(incomes.map((income) => ({ ...income, amount: Number(income.amount) })))
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const amount = Number(body.amount)
    if (!body.source || !body.date || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Source, date and a valid amount are required." }, { status: 400 })
    }

    const income = await prisma.income.create({
      data: {
        userId,
        source: String(body.source),
        amount,
        date: new Date(body.date),
        category: String(body.category || "Salary"),
        notes: body.notes ? String(body.notes) : null,
      },
    })

    after(async () => {
      try {
        await createIncomeAddedNotification(userId, income.source, amount)
        await syncAllNotifications(userId)
      } catch (error) {
        console.error("Income notification sync error:", error)
      }
    })

    return NextResponse.json({ ...income, amount: Number(income.amount) }, { status: 201 })
  } catch (error) {
    console.error("Income creation error:", error)
    return NextResponse.json({ error: "Failed to create income." }, { status: 500 })
  }
}
