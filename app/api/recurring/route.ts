import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncRecurringReminders } from "@/lib/notifications"
import { after, NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()
  return (session?.user as any)?.id as string | undefined
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.recurringExpense.findMany({ where: { userId }, orderBy: { nextDate: "asc" } })
  return NextResponse.json(items.map((item) => ({ ...item, amount: Number(item.amount) })))
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const amount = Number(body.amount)
    if (!body.merchant || !body.category || !body.paymentMethod || !body.frequency || !body.nextDate || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Complete all recurring payment fields." }, { status: 400 })
    }

    const item = await prisma.recurringExpense.create({
      data: {
        userId,
        merchant: String(body.merchant),
        amount,
        category: String(body.category),
        paymentMethod: String(body.paymentMethod),
        frequency: String(body.frequency),
        nextDate: new Date(body.nextDate),
        active: body.active !== false,
      },
    })

    after(() => syncRecurringReminders(userId).catch((error) => console.error("Recurring notification sync error:", error)))
    return NextResponse.json({ ...item, amount: Number(item.amount) }, { status: 201 })
  } catch (error) {
    console.error("Create recurring payment error:", error)
    return NextResponse.json({ error: "Failed to create recurring payment." }, { status: 500 })
  }
}
