import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function uid() {
  const session =
    await auth()

  return (session?.user as any)
    ?.id as
    | string
    | undefined
}

/* ========================================
   GET ACCOUNT PUSH PREFERENCES
======================================== */

export async function GET() {
  const userId =
    await uid()

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
    const preference =
      await prisma
        .pushPreference
        .findUnique({
          where: {
            userId,
          },
        })

    if (!preference) {
      return NextResponse.json(
        {
          recurring:
            true,

          borrowLend:
            true,

          budgets:
            true,

          overdue:
            true,
        }
      )
    }

    return NextResponse.json(
      {
        recurring:
          preference
            .recurring,

        borrowLend:
          preference
            .borrowLend,

        budgets:
          preference
            .budgets,

        overdue:
          preference
            .overdue,
      }
    )
  } catch (error) {
    console.error(
      "Load push preferences error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Could not load push notification preferences.",
      },
      {
        status: 500,
      }
    )
  }
}

/* ========================================
   UPDATE ACCOUNT PREFERENCES
======================================== */

export async function PATCH(
  req: Request
) {
  const userId =
    await uid()

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

    const data = {
      recurring:
        body.recurring !==
        false,

      borrowLend:
        body.borrowLend !==
        false,

      budgets:
        body.budgets !==
        false,

      overdue:
        body.overdue !==
        false,
    }

    /*
      enabled is NOT controlled by
      this endpoint anymore.

      It represents whether the account
      currently has at least one push
      device registered.
    */

    const subscriptions =
      await prisma
        .pushSubscription
        .count({
          where: {
            userId,
          },
        })

    const preference =
      await prisma
        .pushPreference
        .upsert({
          where: {
            userId,
          },

          update: {
            ...data,
          },

          create: {
            userId,

            enabled:
              subscriptions >
              0,

            ...data,
          },
        })

    return NextResponse.json(
      {
        recurring:
          preference
            .recurring,

        borrowLend:
          preference
            .borrowLend,

        budgets:
          preference
            .budgets,

        overdue:
          preference
            .overdue,
      }
    )
  } catch (error) {
    console.error(
      "Update push preferences error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Could not update push notification preferences.",
      },
      {
        status: 500,
      }
    )
  }
}