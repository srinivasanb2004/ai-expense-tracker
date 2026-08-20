import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

import {
  syncBorrowLendNotifications,
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

    const deleted =
      await prisma.borrowLend.deleteMany({
        where: {
          id,
          userId,
        },
      })

    if (
      !deleted.count
    ) {
      return NextResponse.json(
        {
          error:
            "Record not found.",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      success:
        true,
    })
  } catch (error) {
    console.error(
      "Delete Borrow/Lend error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Could not delete record.",
      },
      {
        status: 500,
      }
    )
  }
}

/* ========================================
   UPDATE
======================================== */

export async function PUT(
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
      await req.json()

    const amount =
      Number(
        body.amount
      )

    const existing =
      await prisma.borrowLend.findFirst({
        where: {
          id,
          userId,
        },

        include: {
          repayments:
            true,
        },
      })

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Record not found.",
        },
        {
          status: 404,
        }
      )
    }

    const repaid =
      existing.repayments.reduce(
        (
          sum,
          repayment
        ) =>
          sum +
          Number(
            repayment.amount
          ),
        0
      )

    if (
      !body.person ||
      ![
        "BORROWED",
        "LENT",
      ].includes(
        String(
          body.type
        )
      ) ||
      !Number.isFinite(
        amount
      ) ||
      amount <= 0 ||
      amount <
        repaid
    ) {
      return NextResponse.json(
        {
          error:
            "Enter valid details. Amount cannot be below already repaid value.",
        },
        {
          status: 400,
        }
      )
    }

    const startDate =
      new Date(
        body.startDate
      )

    const dueDate =
      body.dueDate
        ? new Date(
            body.dueDate
          )
        : null

    if (
      dueDate &&
      dueDate <
        startDate
    ) {
      return NextResponse.json(
        {
          error:
            "Due date cannot be before the start date.",
        },
        {
          status: 400,
        }
      )
    }

    const updated =
      await prisma.borrowLend.update({
        where: {
          id,
        },

        data: {
          person:
            String(
              body.person
            ).trim(),

          phone:
            body.phone
              ? String(
                  body.phone
                ).trim()
              : null,

          type:
            String(
              body.type
            ),

          amount,

          startDate,

          dueDate,

          notes:
            body.notes
              ? String(
                  body.notes
                )
              : null,
        },

        include: {
          repayments: {
            orderBy: {
              date: "desc",
            },
          },
        },
      })

    /*
      Run notification generation +
      Firebase push AFTER response.

      Only this record is checked.
    */

    after(async () => {
      try {
        const notificationIds =
          await syncBorrowLendNotifications(
            userId,
            new Date(),
            {
              borrowLendId:
                updated.id,
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
          "Borrow/Lend edit notification error:",
          error
        )
      }
    })

    const paid =
      updated.repayments.reduce(
        (
          sum,
          repayment
        ) =>
          sum +
          Number(
            repayment.amount
          ),
        0
      )

    const total =
      Number(
        updated.amount
      )

    return NextResponse.json({
      ...updated,

      amount:
        total,

      repaid:
        paid,

      remaining:
        Math.max(
          total -
            paid,
          0
        ),

      repayments:
        updated.repayments.map(
          (
            repayment
          ) => ({
            ...repayment,

            amount:
              Number(
                repayment.amount
              ),
          })
        ),
    })
  } catch (error) {
    console.error(
      "Update Borrow/Lend error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Could not update record.",
      },
      {
        status: 500,
      }
    )
  }
}