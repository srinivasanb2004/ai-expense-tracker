import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const expenses = await prisma.expense.findMany({ where: { userId }, orderBy: { date: "desc" } })
  const esc = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`
  const csv = [
    "Date,Merchant,Category,Payment Method,Amount,Notes",
    ...expenses.map((item) =>
      [item.date.toISOString().slice(0, 10), item.merchant, item.category, item.paymentMethod, Number(item.amount), item.notes || ""]
        .map(esc)
        .join(",")
    ),
  ].join("\n")

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="expenses.csv"',
    },
  })
}
