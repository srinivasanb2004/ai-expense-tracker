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
   CHECK CURRENT DEVICE SUBSCRIPTION
======================================== */

export async function GET(
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
    const url =
      new URL(req.url)

    const token =
      url.searchParams.get(
        "token"
      )

    if (!token) {
      return NextResponse.json(
        {
          enabled:
            false,
        }
      )
    }

    const subscription =
      await prisma
        .pushSubscription
        .findFirst({
          where: {
            userId,
            token,
          },

          select: {
            id: true,
          },
        })

    return NextResponse.json(
      {
        enabled:
          !!subscription,
      }
    )
  } catch (error) {
    console.error(
      "Check push subscription error:",
      error
    )

    return NextResponse.json(
      {
        enabled:
          false,
      },
      {
        status: 500,
      }
    )
  }
}

/* ========================================
   REGISTER THIS DEVICE
======================================== */

export async function POST(
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
    const {
      token,
      userAgent,
    } =
      await req.json()

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Push token is required.",
        },
        {
          status: 400,
        }
      )
    }

    const tokenValue =
      String(token)

    /*
      FCM token is globally unique.

      If the same browser was previously
      associated with another WalletIQ
      account, move it safely to the
      currently logged-in account.
    */

    const existing =
      await prisma
        .pushSubscription
        .findUnique({
          where: {
            token:
              tokenValue,
          },
        })

    let subscription

    if (
      existing &&
      existing.userId !==
        userId
    ) {
      /*
        Old delivery records belong to
        the previous account/device
        relationship.

        Remove them before moving token.
      */

      await prisma
        .pushDelivery
        .deleteMany({
          where: {
            subscriptionId:
              existing.id,
          },
        })

      subscription =
        await prisma
          .pushSubscription
          .update({
            where: {
              id:
                existing.id,
            },

            data: {
              userId,

              userAgent:
                userAgent
                  ? String(
                      userAgent
                    )
                  : null,
            },
          })
    } else {
      subscription =
        await prisma
          .pushSubscription
          .upsert({
            where: {
              token:
                tokenValue,
            },

            update: {
              userId,

              userAgent:
                userAgent
                  ? String(
                      userAgent
                    )
                  : null,
            },

            create: {
              userId,

              token:
                tokenValue,

              userAgent:
                userAgent
                  ? String(
                      userAgent
                    )
                  : null,
            },
          })
    }

    /*
      The account now has at least
      one registered device.
    */

    await prisma
      .pushPreference
      .upsert({
        where: {
          userId,
        },

        update: {
          enabled:
            true,
        },

        create: {
          userId,
          enabled:
            true,
        },
      })

    return NextResponse.json(
      {
        success:
          true,

        enabled:
          true,

        id:
          subscription.id,
      }
    )
  } catch (error) {
    console.error(
      "Register push subscription error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Could not register this device.",
      },
      {
        status: 500,
      }
    )
  }
}

/* ========================================
   REMOVE THIS DEVICE
======================================== */

export async function DELETE(
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
    const {
      token,
    } =
      await req
        .json()
        .catch(
          () => ({})
        )

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Push token is required.",
        },
        {
          status: 400,
        }
      )
    }

    await prisma
      .pushSubscription
      .deleteMany({
        where: {
          userId,

          token:
            String(
              token
            ),
        },
      })

    /*
      Check whether this account still
      has another registered device.
    */

    const remainingDevices =
      await prisma
        .pushSubscription
        .count({
          where: {
            userId,
          },
        })

    /*
      Keep the account enabled while
      at least one device remains.

      Laptop stays enabled if mobile
      is disabled, and vice versa.
    */

    await prisma
      .pushPreference
      .upsert({
        where: {
          userId,
        },

        update: {
          enabled:
            remainingDevices >
            0,
        },

        create: {
          userId,

          enabled:
            remainingDevices >
            0,
        },
      })

    return NextResponse.json(
      {
        success:
          true,

        accountHasDevices:
          remainingDevices >
          0,
      }
    )
  } catch (error) {
    console.error(
      "Delete push subscription error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Could not remove this device.",
      },
      {
        status: 500,
      }
    )
  }
}