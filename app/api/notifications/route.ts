import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncAllNotifications } from "@/lib/notifications"
import { NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()
  return (session?.user as any)?.id as string | undefined
}

/*
  GET
  Only fetch existing notifications.

  IMPORTANT:
  We do NOT call syncAllNotifications here anymore.
  This keeps normal page loading fast.
*/
export async function GET() {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ])

    return NextResponse.json({
      notifications,
      unread,
    })
  } catch (error) {
    console.error("Get notifications error:", error)

    return NextResponse.json(
      {
        error: "Failed to load notifications.",
      },
      {
        status: 500,
      }
    )
  }
}

/*
  POST
  Explicitly synchronize notifications.

  We call this only when needed,
  such as when the user opens the notification bell.
*/
export async function POST() {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await syncAllNotifications(userId)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Notification sync error:", error)

    return NextResponse.json(
      {
        error: "Failed to sync notifications.",
      },
      {
        status: 500,
      }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req
      .json()
      .catch(() => ({}))

    if (body.id) {
      await prisma.notification.updateMany({
        where: {
          id: String(body.id),
          userId,
        },
        data: {
          read: true,
        },
      })
    } else {
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "Update notification error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to update notifications.",
      },
      {
        status: 500,
      }
    )
  }
}