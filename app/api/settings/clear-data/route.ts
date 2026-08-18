import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.$transaction([
      prisma.expense.deleteMany({ where: { userId } }),
      prisma.budget.deleteMany({ where: { userId } }),
      prisma.income.deleteMany({ where: { userId } }),
      prisma.account.deleteMany({ where: { userId } }),
      prisma.recurringExpense.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
    ])

    return NextResponse.json({ success: true, message: "All financial data cleared successfully." })
  } catch (error) {
    console.error("Clear data error:", error)
    return NextResponse.json({ error: "Failed to clear data." }, { status: 500 })
  }
}
