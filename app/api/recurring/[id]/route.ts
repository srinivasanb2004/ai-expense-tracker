import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

import {
  syncAllNotifications,
  syncRecurringReminders,
} from "@/lib/notifications"

import {
  deliverNotificationPushes,
  deliverPendingPushes,
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

function advanceDate(
  date: Date,
  frequency: string
) {
  const next = new Date(date)

  if (frequency === "Weekly") {
    next.setDate(
      next.getDate() + 7
    )
  } else if (
    frequency === "Yearly"
  ) {
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
   TARGETED RECURRING PUSH
======================================== */

function queueRecurringPush(
  userId: string,
  recurringExpenseId: string
) {
  after(async () => {
    try {
      const notificationIds =
        await syncRecurringReminders(
          userId,
          new Date(),
          {
            recurringExpenseId,
          }
        )

      if (
        notificationIds.length
      ) {
        await deliverNotificationPushes(
          userId,
          notificationIds
        )
      }
    } catch (error) {
      console.error(
        "Recurring targeted push error:",
        error
      )
    }
  })
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
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }

  try {
    const { id } =
      await params

    await prisma
      .recurringExpense
      .deleteMany({
        where: {
          id,
          userId,
        },
      })

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
   PATCH
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
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }

  try {
    const { id } =
      await params

    const body =
      await req
        .json()
        .catch(
          () => ({})
        )

    const item =
      await prisma
        .recurringExpense
        .findFirst({
          where: {
            id,
            userId,
          },
        })

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
      body.action ===
      "edit"
    ) {
      const amount =
        Number(
          body.amount
        )

      if (
        !body.merchant ||
        !body.category ||
        !body.paymentMethod ||
        !body.frequency ||
        !body.nextDate ||
        !Number.isFinite(
          amount
        ) ||
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
        new Date(
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
              "Please select a valid payment date.",
          },
          {
            status: 400,
          }
        )
      }

      const updated =
        await prisma
          .recurringExpense
          .update({
            where: {
              id,
            },

            data: {
              merchant:
                String(
                  body.merchant
                ),

              amount,

              category:
                String(
                  body.category
                ),

              paymentMethod:
                String(
                  body.paymentMethod
                ),

              frequency:
                String(
                  body.frequency
                ),

              nextDate,
            },
          })

      /*
        IMPORTANT:

        Return updated recurring payment
        without waiting for Firebase.

        Background task only processes
        THIS recurring item.
      */

      queueRecurringPush(
        userId,
        updated.id
      )

      return NextResponse.json(
        {
          ...updated,

          amount:
            Number(
              updated.amount
            ),
        }
      )
    }

    /* ====================================
       MARK PAID
    ==================================== */

    if (
      body.action ===
      "mark_paid"
    ) {
      const nextDate =
        advanceDate(
          item.nextDate,
          item.frequency
        )

      const [
        ,
        updated,
      ] =
        await prisma
          .$transaction([
            prisma.expense.create({
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
            }),

            prisma.recurringExpense.update({
              where: {
                id,
              },

              data: {
                nextDate,
              },
            }),
          ])

      /*
        Clear old unread payment reminders.
      */

      await prisma.notification.updateMany({
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
      })

      /*
        Do NOT make UI wait for all
        notification syncing.

        Run general sync after response.
      */

      after(async () => {
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
      })

      return NextResponse.json(
        {
          ...updated,

          amount:
            Number(
              updated.amount
            ),
        }
      )
    }

    /* ====================================
       PAUSE / RESUME
    ==================================== */

    const updated =
      await prisma
        .recurringExpense
        .update({
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
        })

    /*
      Only when resumed:
      check this specific recurring item.
    */

    if (
      updated.active
    ) {
      queueRecurringPush(
        userId,
        updated.id
      )
    }

    return NextResponse.json(
      {
        ...updated,

        amount:
          Number(
            updated.amount
          ),
      }
    )
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