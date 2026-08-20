import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncAllNotifications } from "@/lib/notifications"
import { after, NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const payment = Number(body.amount)
    if (!Number.isFinite(payment) || payment <= 0) {
      return NextResponse.json({ error: "Enter a valid repayment amount." }, { status: 400 })
    }

    const record = await prisma.borrowLend.findFirst({
      where: { id, userId },
      include: { repayments: true },
    })
    if (!record) return NextResponse.json({ error: "Record not found." }, { status: 404 })
    if (record.status === "SETTLED") return NextResponse.json({ error: "This record is already settled." }, { status: 400 })

    const repaid = record.repayments.reduce((sum, item) => sum + Number(item.amount), 0)
    const remaining = Number(record.amount) - repaid
    if (payment > remaining + 0.001) {
      return NextResponse.json({ error: `Repayment cannot exceed the remaining ₹${remaining.toLocaleString("en-IN")}.` }, { status: 400 })
    }

    const newPaid = repaid + payment
    const settled = newPaid >= Number(record.amount) - 0.001
    const date = body.date ? new Date(body.date) : new Date()

    const tx: any[] = [
      prisma.borrowLendRepayment.create({
        data: {
          borrowLendId: record.id,
          amount: payment,
          date,
          notes: body.notes ? String(body.notes) : null,
        },
      }),
      prisma.borrowLend.update({
        where: { id: record.id },
        data: {
          status: settled ? "SETTLED" : "PARTIAL",
          settledAt: settled ? date : null,
        },
      }),
    ]

    // Returning money that you borrowed is a real outgoing payment, so the
    // user may optionally add that repayment to Expenses. Receiving money you
    // previously lent is intentionally not treated as new income.
    if (record.type === "BORROWED" && body.createExpense === true) {
      tx.push(
        prisma.expense.create({
          data: {
            userId,
            merchant: `Repayment to ${record.person}`,
            amount: payment,
            category: "Bills",
            paymentMethod: String(body.paymentMethod || "UPI"),
            date,
            notes: `Borrowed money repayment${body.notes ? ` · ${String(body.notes)}` : ""}`,
          },
        })
      )
    }

    await prisma.$transaction(tx)

    if (settled) {
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
          OR: [
            { body: { contains: record.person } },
            { title: { contains: record.person } },
          ],
        },
        data: { read: true },
      })
    }

    after(() => syncAllNotifications(userId).catch((error) => console.error("Repayment notification sync error:", error)))
    return NextResponse.json({ success: true, settled })
  } catch (error) {
    console.error("Borrow/lend repayment error:", error)
    return NextResponse.json({ error: "Failed to save repayment." }, { status: 500 })
  }
}
