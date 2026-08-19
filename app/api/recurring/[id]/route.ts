import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncAllNotifications } from "@/lib/notifications"
import { NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()
  return (session?.user as any)?.id as string | undefined
}

function advanceDate(date: Date, frequency: string) {
  const next = new Date(date)
  if (frequency === "Weekly") next.setDate(next.getDate() + 7)
  else if (frequency === "Yearly") next.setFullYear(next.getFullYear() + 1)
  else next.setMonth(next.getMonth() + 1)
  return next
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.recurringExpense.deleteMany({ where: { id, userId } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const item = await prisma.recurringExpense.findFirst({ where: { id, userId } })
  if (!item) return NextResponse.json({ error: "Recurring payment not found." }, { status: 404 })

  if (body.action === "edit") {
    const amount = Number(body.amount)
    if (!body.merchant || !body.category || !body.paymentMethod || !body.frequency || !body.nextDate || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Complete all recurring payment fields." }, { status: 400 })
    const updated = await prisma.recurringExpense.update({ where: { id }, data: { merchant:String(body.merchant), amount, category:String(body.category), paymentMethod:String(body.paymentMethod), frequency:String(body.frequency), nextDate:new Date(body.nextDate) } })
    return NextResponse.json({ ...updated, amount:Number(updated.amount) })
  }

  if (body.action === "mark_paid") {
    const nextDate = advanceDate(item.nextDate, item.frequency)
    const [, updated] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          userId,
          merchant: item.merchant,
          amount: item.amount,
          category: item.category,
          paymentMethod: item.paymentMethod,
          date: new Date(),
          notes: `Recurring ${item.frequency.toLowerCase()} payment`,
        },
      }),
      prisma.recurringExpense.update({ where: { id }, data: { nextDate } }),
    ])

    // Once paid, clear any unread due/overdue reminders for this merchant so
    // stale payment warnings do not remain highlighted in the bell.
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
        title: { startsWith: `${item.merchant} payment` },
      },
      data: { read: true },
    })

    await syncAllNotifications(userId)
    return NextResponse.json({ ...updated, amount: Number(updated.amount) })
  }

  const updated = await prisma.recurringExpense.update({
    where: { id },
    data: { active: typeof body.active === "boolean" ? body.active : item.active },
  })
  return NextResponse.json({ ...updated, amount: Number(updated.amount) })
}
