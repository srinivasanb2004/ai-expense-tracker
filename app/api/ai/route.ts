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
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 503 })

    const body = await req.json()
    const question = String(body.question || "").trim()
    if (!question) return NextResponse.json({ error: "Please enter a question." }, { status: 400 })

    const expenses = await prisma.expense.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 300 })
    const incomes = await prisma.income.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 100 })

    const prompt = `You are a concise personal-finance assistant inside WalletIQ. Currency is Indian Rupees (₹). Answer ONLY from the user's data below. Calculate carefully, never invent transactions, and say when data is insufficient.\n\nEXPENSES:\n${JSON.stringify(expenses.map(e => ({ merchant: e.merchant, amount: Number(e.amount), category: e.category, paymentMethod: e.paymentMethod, date: e.date.toISOString().slice(0,10), notes: e.notes })))}\n\nINCOME:\n${JSON.stringify(incomes.map(i => ({ source: i.source, amount: Number(i.amount), category: i.category, date: i.date.toISOString().slice(0,10) })))}\n\nQUESTION:\n${question}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
      }
    )

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return NextResponse.json({ error: payload?.error?.message || `Gemini request failed (${response.status}).` }, { status: response.status })
    }

    const answer = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "I couldn't generate an answer."
    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error("Gemini AI error:", error)
    return NextResponse.json({ error: error?.message || "Something went wrong while contacting Gemini." }, { status: 500 })
  }
}
