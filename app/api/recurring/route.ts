import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncRecurringReminders } from "@/lib/notifications"
import { deliverPendingPushes } from "@/lib/push"
import { NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()

  return (session?.user as any)?.id as
    | string
    | undefined
}

/* =========================
   GET RECURRING PAYMENTS
========================= */

export async function GET() {
  const userId = await getUserId()

  if (!userId) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }

  try {
    const items =
      await prisma.recurringExpense.findMany({
        where: {
          userId,
        },

        orderBy: {
          nextDate: "asc",
        },
      })

    return NextResponse.json(
      items.map((item) => ({
        ...item,
        amount: Number(item.amount),
      }))
    )
  } catch (error) {
    console.error(
      "Load recurring payments error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load recurring payments.",
      },
      {
        status: 500,
      }
    )
  }
}

/* =========================
   CREATE RECURRING PAYMENT
========================= */

export async function POST(req: Request) {
  const userId = await getUserId()

  if (!userId) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }

  try {
    const body = await req.json()

    const amount = Number(body.amount)

    if (
      !body.merchant ||
      !body.category ||
      !body.paymentMethod ||
      !body.frequency ||
      !body.nextDate ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Complete all recurring payment fields.",
        },
        {
          status: 400,
        }
      )
    }

    const nextDate = new Date(
      body.nextDate
    )

    if (
      Number.isNaN(
        nextDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid next payment date.",
        },
        {
          status: 400,
        }
      )
    }

    const item =
      await prisma.recurringExpense.create({
        data: {
          userId,

          merchant: String(
            body.merchant
          ),

          amount,

          category: String(
            body.category
          ),

          paymentMethod: String(
            body.paymentMethod
          ),

          frequency: String(
            body.frequency
          ),

          nextDate,

          active:
            body.active !== false,
        },
      })

    /* =====================================
       IMMEDIATE NOTIFICATION + PUSH

       Due today / tomorrow:
       create in-app reminder
       then send Firebase push immediately
    ===================================== */

    try {
      await syncRecurringReminders(
        userId
      )

      await deliverPendingPushes(
        userId
      )
    } catch (error) {
      console.error(
        "Immediate recurring push error:",
        error
      )
    }

    return NextResponse.json(
      {
        ...item,
        amount: Number(
          item.amount
        ),
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "Create recurring payment error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to create recurring payment.",
      },
      {
        status: 500,
      }
    )
  }
}