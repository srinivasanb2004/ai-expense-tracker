import { auth } from "@/auth"
import { NextResponse } from "next/server"

type SuggestionType = "RECURRING" | "BUDGET" | "BORROW_LEND"

const prompt = `
You are the financial-note analyzer inside WalletIQ.
Read ONE user note and detect only clear, actionable financial plans.
Return ONLY valid JSON in this exact shape:
{
  "summary": "short one-sentence summary",
  "suggestions": [
    {
      "type": "RECURRING" | "BUDGET" | "BORROW_LEND",
      "title": "short human-friendly title",
      "confidence": "high" | "medium",
      "fields": {}
    }
  ]
}

Allowed suggestion fields:
RECURRING: merchant, amount, category, paymentMethod, frequency, nextDate
BUDGET: category, amount, month, year
BORROW_LEND: person, type, amount, startDate, dueDate, phone, notes

Rules:
- Currency is Indian Rupees (₹).
- Never invent missing facts.
- Use null for unknown optional values.
- Dates must be YYYY-MM-DD when the note gives enough information to resolve them.
- For relative dates such as today/tomorrow, use the CURRENT_DATE supplied below.
- RECURRING frequency must be Weekly, Monthly, or Yearly when clearly stated; otherwise null.
- BORROW_LEND type must be BORROWED when the user owes/borrowed money, or LENT when another person owes the user.
- A budget means a spending limit/target, not a normal purchase.
- Do not suggest ordinary one-time expenses unless they clearly describe Borrow/Lend, a Budget, or a Recurring payment.
- Do not create duplicates just because the same information appears in the title and body.
- If nothing actionable is present, return an empty suggestions array.
- Maximum 6 suggestions.
- No markdown fences and no commentary outside JSON.
`

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim()

  const first = cleaned.indexOf("{")
  const last = cleaned.lastIndexOf("}")

  if (first === -1 || last === -1 || last < first) {
    throw new Error("Gemini did not return valid note analysis JSON.")
  }

  return JSON.parse(cleaned.slice(first, last + 1))
}

function safeType(value: unknown): SuggestionType | null {
  return value === "RECURRING" || value === "BUDGET" || value === "BORROW_LEND"
    ? value
    : null
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id as string | undefined

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 503 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const title = String(body.title || "").trim()
    const content = String(body.content || "").trim()
    const items = Array.isArray(body.items)
      ? body.items
          .map((item: any) => ({
            text: String(item?.text || "").trim(),
            checked: Boolean(item?.checked),
          }))
          .filter((item: any) => item.text)
      : []

    if (!title && !content && !items.length) {
      return NextResponse.json(
        { error: "Add some note content before analyzing it." },
        { status: 400 }
      )
    }

    const currentDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())

    const notePayload = {
      title,
      content,
      checklist: items,
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${prompt}\nCURRENT_DATE: ${currentDate}\n\nNOTE:\n${JSON.stringify(notePayload)}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    )

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        payload?.error?.message || `Gemini request failed (${response.status}).`
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text || "")
        .join("") || ""

    const parsed = extractJson(text)
    const rawSuggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
      : []

    const suggestions = rawSuggestions
      .slice(0, 6)
      .map((item: any, index: number) => {
        const type = safeType(item?.type)
        if (!type) return null

        return {
          id: `${type.toLowerCase()}-${index}`,
          type,
          title: String(item?.title || "Suggested action"),
          confidence: item?.confidence === "medium" ? "medium" : "high",
          fields:
            item?.fields && typeof item.fields === "object" ? item.fields : {},
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      summary: String(
        parsed?.summary ||
          (suggestions.length
            ? "WalletIQ found financial actions in this note."
            : "No actionable financial plans were found in this note.")
      ),
      suggestions,
    })
  } catch (error: any) {
    console.error("Gemini note analysis error:", error)
    return NextResponse.json(
      { error: error?.message || "Could not analyze this note." },
      { status: 500 }
    )
  }
}
