import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

import {
  createReceiptSavedNotification,
  syncAllNotifications,
  syncBudgetNotifications,
} from "@/lib/notifications"

import {
  deliverNotificationPushes,
} from "@/lib/push"

import {
  after,
  NextResponse,
} from "next/server"

async function getUserId() {
  const session =
    await auth()

  return (session?.user as any)
    ?.id as
    | string
    | undefined
}

/* ========================================
   GET EXPENSES
======================================== */

export async function GET() {
  const userId =
    await getUserId()

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

  try {
    const expenses =
      await prisma.expense.findMany({
        where: {
          userId,
        },

        orderBy: {
          date: "desc",
        },
      })

    return NextResponse.json(
      expenses.map(
        (expense) => ({
          ...expense,

          amount:
            Number(
              expense.amount
            ),
        })
      )
    )
  } catch (error) {
    console.error(
      "Load expenses error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load expenses.",
      },
      {
        status: 500,
      }
    )
  }
}

/* ========================================
   CREATE EXPENSE
======================================== */

export async function POST(
  req: Request
) {
  const userId =
    await getUserId()

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

  try {
    const body =
      await req.json()

    const amount =
      Number(
        body.amount
      )

    if (
      !body.merchant ||
      !body.category ||
      !body.paymentMethod ||
      !body.date ||
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete all required expense fields.",
        },
        {
          status: 400,
        }
      )
    }

    const date =
      new Date(
        body.date
      )

    if (
      Number.isNaN(
        date.getTime()
      ) ||
      date.getTime() >
        Date.now() +
          86_400_000
    ) {
      return NextResponse.json(
        {
          error:
            "Expense date cannot be in the future.",
        },
        {
          status: 400,
        }
      )
    }

    /* ====================================
       SAVE EXPENSE FIRST
    ==================================== */

    const expense =
      await prisma.expense.create({
        data: {
          userId,

          amount,

          merchant:
            String(
              body.merchant
            ),

          category:
            String(
              body.category
            ),

          paymentMethod:
            String(
              body.paymentMethod
            ),

          date,

          notes:
            body.notes
              ? String(
                  body.notes
                )
              : null,
        },
      })

    /*
      IMPORTANT:

      User does not wait for notification
      generation or Firebase delivery.

      Expense API can return quickly.
    */

    after(async () => {
      try {
        /* ================================
           RECEIPT-SCAN IN-APP NOTIFICATION
        ================================ */

        if (
          body.source ===
          "receipt_scan"
        ) {
          await createReceiptSavedNotification(
            userId,
            expense.merchant,
            amount
          )
        }

        /* ================================
           TARGETED BUDGET WARNING
        ================================ */

        const budgetNotificationIds =
          await syncBudgetNotifications(
            userId,
            new Date(),
            {
              category:
                expense.category,
            }
          )

        /*
          Push ONLY the newly generated
          budget warning/exceeded alert.
        */

        if (
          budgetNotificationIds.length
        ) {
          await deliverNotificationPushes(
            userId,
            budgetNotificationIds
          )
        }

        /* ================================
           OTHER IN-APP NOTIFICATION SYNC
        ================================ */

        /*
          Keep your existing WalletIQ
          notification functionality.

          This can update things like:
          - unusual spending
          - low remaining balance
          - recurring
          - borrow/lend
          - monthly summary

          But we do NOT call broad
          deliverPendingPushes() here,
          so old push notifications
          won't suddenly be flushed.
        */

        await syncAllNotifications(
          userId
        )
      } catch (error) {
        console.error(
          "Expense notification sync error:",
          error
        )
      }
    })

    return NextResponse.json(
      {
        ...expense,

        amount:
          Number(
            expense.amount
          ),
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "Create expense error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to create expense.",
      },
      {
        status: 500,
      }
    )
  }
}