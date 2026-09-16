import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
    if (!apiKey) return NextResponse.json({ error: "WalletIQ AI is not configured" }, { status: 503 })

    const body = await req.json()
    const question = String(body.question || "").trim()
    if (!question) return NextResponse.json({ error: "Please enter a question." }, { status: 400 })

    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where: { userId }, orderBy: { date: "desc" }, take: 150,
        select: { merchant: true, amount: true, category: true, paymentMethod: true, date: true },
      }),
      prisma.income.findMany({
        where: { userId }, orderBy: { date: "desc" }, take: 60,
        select: { source: true, amount: true, category: true, date: true },
      }),
    ])

    const prompt = `You are a concise personal-finance assistant inside WalletIQ. Currency is Indian Rupees (₹). Answer ONLY from the user's data below. Calculate carefully, never invent transactions, and say when data is insufficient. These are the most recent 150 expenses and 60 incomes; do not claim older history is complete.\n\nEXPENSES:\n${JSON.stringify(expenses.map(e => ({ merchant: e.merchant, amount: Number(e.amount), category: e.category, paymentMethod: e.paymentMethod, date: e.date.toISOString().slice(0,10) })))}\n\nINCOME:\n${JSON.stringify(incomes.map(i => ({ source: i.source, amount: Number(i.amount), category: i.category, date: i.date.toISOString().slice(0,10) })))}\n\nQUESTION:\n${question}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
      }
    )

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return NextResponse.json({ error: payload?.error?.message || `WalletIQ AI request failed (${response.status}).` }, { status: response.status })
    }

    const answer = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "I couldn't generate an answer."
    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error("Gemini AI error:", error)
    return NextResponse.json({ error: error?.message || "Something went wrong while contacting WalletIQ AI." }, { status: 500 })
  }
}
