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

async function userId() {
  const session =
    await auth()

  return (session?.user as any)
    ?.id as
    | string
    | undefined
}

function serialize(
  item: any
) {
  const paid =
    item.repayments.reduce(
      (
        sum: number,
        repayment: any
      ) =>
        sum +
        Number(
          repayment.amount
        ),
      0
    )

  const amount =
    Number(item.amount)

  return {
    ...item,

    amount,

    repaid:
      paid,

    remaining:
      Math.max(
        amount - paid,
        0
      ),

    repayments:
      item.repayments.map(
        (
          repayment: any
        ) => ({
          ...repayment,

          amount:
            Number(
              repayment.amount
            ),
        })
      ),
  }
}

/* ========================================
   GET
======================================== */

export async function GET() {
  const id =
    await userId()

  if (!id) {
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
    const records =
      await prisma.borrowLend.findMany({
        where: {
          userId: id,
        },

        include: {
          repayments: {
            orderBy: {
              date: "desc",
            },
          },
        },

        orderBy: [
          {
            status: "asc",
          },

          {
            dueDate: "asc",
          },

          {
            createdAt:
              "desc",
          },
        ],
      })

    return NextResponse.json(
      records.map(
        serialize
      )
    )
  } catch (error) {
    console.error(
      "Load Borrow/Lend error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load Borrow & Lend records.",
      },
      {
        status: 500,
      }
    )
  }
}

/* ========================================
   CREATE
======================================== */

export async function POST(
  req: Request
) {
  const id =
    await userId()

  if (!id) {
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

    const type =
      String(
        body.type || ""
      )

    if (
      !body.person ||
      ![
        "BORROWED",
        "LENT",
      ].includes(type) ||
      !Number.isFinite(
        amount
      ) ||
      amount <= 0 ||
      !body.startDate
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete person, type, amount and date.",
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

    const record =
      await prisma.borrowLend.create({
        data: {
          userId:
            id,

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

          type,

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
          repayments:
            true,
        },
      })

    /*
      After API response:

      only process THIS Borrow/Lend record
      and push only its notification.
    */

    after(async () => {
      try {
        const notificationIds =
          await syncBorrowLendNotifications(
            id,
            new Date(),
            {
              borrowLendId:
                record.id,
            }
          )

        if (
          notificationIds.length
        ) {
          await deliverNotificationPushes(
            id,
            notificationIds
          )
        }
      } catch (error) {
        console.error(
          "Borrow/Lend targeted notification error:",
          error
        )
      }
    })

    return NextResponse.json(
      serialize(record),
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "Create borrow/lend record error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to save the record.",
      },
      {
        status: 500,
      }
    )
  }
}