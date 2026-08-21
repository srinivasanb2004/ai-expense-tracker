import { auth } from "@/auth"
import { NextResponse } from "next/server"

const MAX_RECEIPT_SIZE =
  8 * 1024 * 1024

const receiptPrompt = `
Extract this expense receipt and return ONLY valid JSON with exactly these keys:
merchant, amount, date, tax, category, paymentMethod, notes.

Rules:
- merchant: business/store/service name, or "Unknown" if unreadable.
- amount: final total as a number.
- date: YYYY-MM-DD, or null if unreadable.
- tax: tax/GST amount as a number, or null.
- category: one of Food, Transport, Shopping, Bills, Health, Entertainment, Education, Other.
- paymentMethod: one of UPI, Card, Cash, Bank Transfer, Other. Use Other if unknown.
- notes: short summary of useful receipt details, or null.
- Do not invent values that are not visible.
- Do not wrap the JSON in markdown fences.
`

function extractJson(
  text: string
) {
  const cleaned =
    text
      .trim()
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /```$/i,
        ""
      )
      .trim()

  const first =
    cleaned.indexOf(
      "{"
    )

  const last =
    cleaned.lastIndexOf(
      "}"
    )

  if (
    first === -1 ||
    last === -1
  ) {
    throw new Error(
      "Gemini did not return receipt JSON."
    )
  }

  return JSON.parse(
    cleaned.slice(
      first,
      last + 1
    )
  )
}

async function safeJson(
  response: Response
) {
  const text =
    await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(
      text
    )
  } catch {
    return {
      error: {
        message:
          text
            .replace(
              /<[^>]*>/g,
              " "
            )
            .replace(
              /\s+/g,
              " "
            )
            .trim()
            .slice(
              0,
              300
            ),
      },
    }
  }
}

export async function POST(
  req: Request
) {
  try {
    const session =
      await auth()

    const userId =
      (session?.user as any)
        ?.id as
        | string
        | undefined

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      )
    }

    const apiKey =
      process.env
        .GEMINI_API_KEY

    const model =
      process.env
        .GEMINI_MODEL ||
      "gemini-2.5-flash"

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured",
        },
        {
          status: 503,
        }
      )
    }

    const formData =
      await req.formData()

    const file =
      formData.get(
        "file"
      )

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Please choose a receipt file.",
        },
        {
          status: 400,
        }
      )
    }

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]

    if (
      !allowed.includes(
        file.type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Upload a JPG, PNG, WEBP or PDF receipt.",
        },
        {
          status: 400,
        }
      )
    }

    /*
      Frontend camera photos should already
      be compressed, but keep a strict
      backend safety limit too.
    */

    if (
      file.size >
      MAX_RECEIPT_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Receipt is too large. Please upload an image smaller than 8 MB.",
        },
        {
          status: 413,
        }
      )
    }

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      )

    const base64 =
      buffer.toString(
        "base64"
      )

    const geminiResponse =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              {
                contents: [
                  {
                    role:
                      "user",

                    parts: [
                      {
                        text:
                          receiptPrompt,
                      },

                      {
                        inline_data: {
                          mime_type:
                            file.type,

                          data:
                            base64,
                        },
                      },
                    ],
                  },
                ],

                generationConfig: {
                  temperature:
                    0.1,

                  responseMimeType:
                    "application/json",
                },
              }
            ),
        }
      )

    const payload =
      await safeJson(
        geminiResponse
      )

    if (
      !geminiResponse.ok
    ) {
      const message =
        payload?.error
          ?.message ||
        `Gemini request failed (${geminiResponse.status}).`

      console.error(
        "Gemini API error:",
        geminiResponse.status,
        message
      )

      return NextResponse.json(
        {
          error:
            message,
        },
        {
          status:
            geminiResponse.status >=
              400 &&
            geminiResponse.status <
              600
              ? geminiResponse.status
              : 502,
        }
      )
    }

    const text =
      payload
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(
          (
            part: any
          ) =>
            part.text ||
            ""
        )
        .join(
          ""
        ) || ""

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Gemini could not read this receipt. Please try a clearer photo.",
        },
        {
          status: 422,
        }
      )
    }

    const parsed =
      extractJson(
        text
      )

    const amount =
      Number(
        parsed.amount
      )

    const tax =
      parsed.tax ==
        null ||
      parsed.tax ===
        ""
        ? null
        : Number(
            parsed.tax
          )

    const validCategories = [
      "Food",
      "Transport",
      "Shopping",
      "Bills",
      "Health",
      "Entertainment",
      "Education",
      "Other",
    ]

    const validPayments = [
      "UPI",
      "Card",
      "Cash",
      "Bank Transfer",
      "Other",
    ]

    const category =
      validCategories.includes(
        String(
          parsed.category
        )
      )
        ? String(
            parsed.category
          )
        : "Other"

    const paymentMethod =
      validPayments.includes(
        String(
          parsed.paymentMethod
        )
      )
        ? String(
            parsed.paymentMethod
          )
        : "Other"

    return NextResponse.json(
      {
        merchant:
          String(
            parsed.merchant ||
              "Unknown"
          ),

        amount:
          Number.isFinite(
            amount
          )
            ? amount
            : 0,

        date:
          parsed.date
            ? String(
                parsed.date
              )
            : null,

        tax:
          tax !== null &&
          Number.isFinite(
            tax
          )
            ? tax
            : null,

        category,

        paymentMethod,

        notes:
          parsed.notes
            ? String(
                parsed.notes
              )
            : null,
      }
    )
  } catch (
    error: any
  ) {
    console.error(
      "Gemini receipt OCR error:",
      error
    )

    /*
      Always return JSON from our own route.
    */

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Receipt scanning failed.",
      },
      {
        status: 500,
      }
    )
  }
}