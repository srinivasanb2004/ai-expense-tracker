import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { adminMessaging } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()

  const userId = (session?.user as any)?.id as
    | string
    | undefined

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
    const subscriptions =
      await prisma.pushSubscription.findMany({
        where: {
          userId,
        },
      })

    if (!subscriptions.length) {
      return NextResponse.json(
        {
          error:
            "Enable push notifications on this device first.",
        },
        {
          status: 400,
        }
      )
    }

    let sent = 0
    let failed = 0

    const errors: {
      device: string
      error: string
    }[] = []

    for (const subscription of subscriptions) {
      try {
        await adminMessaging().send({
          token: subscription.token,

          /*
            Native Android notification.
            This allows Android to display
            the notification in the system tray.
          */
          notification: {
            title:
              "WalletIQ test notification",

            body:
              "Push notifications are working on this device.",
          },

          /*
            Custom WalletIQ information.

            Android native app can use this
            when the notification is tapped.

            Browser push can also continue
            using these fields.
          */
          data: {
            title:
              "WalletIQ test notification",

            body:
              "Push notifications are working on this device.",

            url:
              "/settings",
          },

          android: {
            priority: "high",

            notification: {
              sound: "default",

              channelId:
                "walletiq-default",
            },
          },

          webpush: {
            notification: {
              title:
                "WalletIQ test notification",

              body:
                "Push notifications are working on this device.",

              icon:
                "/icon.png",
            },

            fcmOptions: {
              link:
                "https://ai-expense-tracker-sage-seven.vercel.app/settings",
            },
          },
        })

        sent++
      } catch (error: any) {
        failed++

        console.error(
          "Push test delivery error:",
          subscription.userAgent,
          error
        )

        errors.push({
          device:
            subscription.userAgent ||
            "Unknown device",

          error:
            error?.code ||
            error?.message ||
            "Unknown Firebase error",
        })
      }
    }

    return NextResponse.json(
      {
        success: sent > 0,

        sent,

        failed,

        /*
          Useful while we are debugging.
          Later we can remove this.
        */
        errors,
      },
      {
        status:
          sent > 0
            ? 200
            : 500,
      }
    )
  } catch (error) {
    console.error(
      "Push test error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Test notification failed.",
      },
      {
        status: 500,
      }
    )
  }
}