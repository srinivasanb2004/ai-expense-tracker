import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()
  return (session?.user as any)?.id as string | undefined
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(
    expenses.map((expense) => ({ ...expense, amount: Number(expense.amount) }))
  )
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const amount = Number(body.amount)

    if (!body.merchant || !body.category || !body.paymentMethod || !body.date || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Please complete all required expense fields." }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        amount,
        merchant: String(body.merchant),
        category: String(body.category),
        paymentMethod: String(body.paymentMethod),
        date: new Date(body.date),
        notes: body.notes ? String(body.notes) : null,
      },
    })

    return NextResponse.json({ ...expense, amount: Number(expense.amount) }, { status: 201 })
  } catch (error) {
    console.error("Create expense error:", error)
    return NextResponse.json({ error: "Failed to create expense." }, { status: 500 })
  }
}
