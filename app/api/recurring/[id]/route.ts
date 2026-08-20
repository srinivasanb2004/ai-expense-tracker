import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

import {
  syncAllNotifications,
  syncRecurringReminders,
} from "@/lib/notifications"

import { deliverPendingPushes } from "@/lib/push"

import { NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()

  return (session?.user as any)?.id as
    | string
    | undefined
}

function advanceDate(
  date: Date,
  frequency: string
) {
  const next = new Date(date)

  if (frequency === "Weekly") {
    next.setDate(next.getDate() + 7)
  } else if (frequency === "Yearly") {
    next.setFullYear(
      next.getFullYear() + 1
    )
  } else {
    next.setMonth(
      next.getMonth() + 1
    )
  }

  return next
}

/* ========================================
   IMMEDIATE RECURRING PUSH SYNC
======================================== */

async function triggerRecurringPush(
  userId: string
) {
  try {
    await syncRecurringReminders(
      userId
    )

    await deliverPendingPushes(
      userId
    )
  } catch (error) {
    console.error(
      "Recurring push sync error:",
      error
    )
  }
}

/* ========================================
   DELETE
======================================== */

export async function DELETE(
  _: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  const userId =
    await getUserId()

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
    const { id } = await params

    await prisma.recurringExpense.deleteMany(
      {
        where: {
          id,
          userId,
        },
      }
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "Delete recurring payment error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to delete recurring payment.",
      },
      {
        status: 500,
      }
    )
  }
}

/* ========================================
   EDIT / MARK PAID / TOGGLE ACTIVE
======================================== */

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  const userId =
    await getUserId()

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
    const { id } = await params

    const body = await req
      .json()
      .catch(() => ({}))

    const item =
      await prisma.recurringExpense.findFirst(
        {
          where: {
            id,
            userId,
          },
        }
      )

    if (!item) {
      return NextResponse.json(
        {
          error:
            "Recurring payment not found.",
        },
        {
          status: 404,
        }
      )
    }

    /* ====================================
       EDIT RECURRING PAYMENT
    ==================================== */

    if (
      body.action === "edit"
    ) {
      const amount =
        Number(body.amount)

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

      const nextDate =
        new Date(body.nextDate)

      if (
        Number.isNaN(
          nextDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Please select a valid payment date.",
          },
          {
            status: 400,
          }
        )
      }

      const updated =
        await prisma.recurringExpense.update(
          {
            where: {
              id,
            },

            data: {
              merchant: String(
                body.merchant
              ),

              amount,

              category: String(
                body.category
              ),

              paymentMethod:
                String(
                  body.paymentMethod
                ),

              frequency: String(
                body.frequency
              ),

              nextDate,
            },
          }
        )

      /*
       If user edits a future payment
       to today / tomorrow / overdue,
       generate and send push immediately.
      */

      await triggerRecurringPush(
        userId
      )

      return NextResponse.json({
        ...updated,
        amount: Number(
          updated.amount
        ),
      })
    }

    /* ====================================
       MARK PAYMENT AS PAID
    ==================================== */

    if (
      body.action === "mark_paid"
    ) {
      const nextDate =
        advanceDate(
          item.nextDate,
          item.frequency
        )

      const [, updated] =
        await prisma.$transaction(
          [
            prisma.expense.create(
              {
                data: {
                  userId,

                  merchant:
                    item.merchant,

                  amount:
                    item.amount,

                  category:
                    item.category,

                  paymentMethod:
                    item.paymentMethod,

                  date:
                    new Date(),

                  notes:
                    `Recurring ${item.frequency.toLowerCase()} payment`,
                },
              }
            ),

            prisma.recurringExpense.update(
              {
                where: {
                  id,
                },

                data: {
                  nextDate,
                },
              }
            ),
          ]
        )

      /*
       Remove stale unread reminders
       for the payment that was paid.
      */

      await prisma.notification.updateMany(
        {
          where: {
            userId,

            read: false,

            title: {
              startsWith:
                `${item.merchant} payment`,
            },
          },

          data: {
            read: true,
          },
        }
      )

      /*
       Recalculate budget / balance /
       recurring notifications.

       If marking this payment as paid
       creates a new budget warning,
       deliver it immediately.
      */

      try {
        await syncAllNotifications(
          userId
        )

        await deliverPendingPushes(
          userId
        )
      } catch (error) {
        console.error(
          "Post-payment notification error:",
          error
        )
      }

      return NextResponse.json({
        ...updated,

        amount: Number(
          updated.amount
        ),
      })
    }

    /* ====================================
       ACTIVE / PAUSED
    ==================================== */

    const updated =
      await prisma.recurringExpense.update(
        {
          where: {
            id,
          },

          data: {
            active:
              typeof body.active ===
              "boolean"
                ? body.active
                : item.active,
          },
        }
      )

    /*
     If a payment is reactivated and
     it's already due today / tomorrow /
     overdue, push immediately.
    */

    if (updated.active) {
      await triggerRecurringPush(
        userId
      )
    }

    return NextResponse.json({
      ...updated,

      amount: Number(
        updated.amount
      ),
    })
  } catch (error) {
    console.error(
      "Update recurring payment error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to update recurring payment.",
      },
      {
        status: 500,
      }
    )
  }
}