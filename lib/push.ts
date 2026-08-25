import { prisma } from "@/lib/prisma"
import { adminMessaging } from "@/lib/firebase-admin"

/* ========================================
   ROUTE FOR NOTIFICATION
======================================== */

function routeFor(title: string) {
  const t = title.toLowerCase()

  if (t.includes("budget")) {
    return "/budgets"
  }

  if (
    t.includes("repay") ||
    t.includes("money expected") ||
    t.includes("money still")
  ) {
    return "/borrow-lend"
  }

  if (t.includes("payment")) {
    return "/recurring"
  }

  return "/dashboard"
}

/* ========================================
   CHECK USER PREFERENCES
======================================== */

function allowed(title: string, pref: any) {
  const t = title.toLowerCase()

  if (
    (t.includes("overdue") ||
      t.includes("pending")) &&
    !pref.overdue
  ) {
    return false
  }

  if (t.includes("budget")) {
    return pref.budgets
  }

  if (
    t.includes("repay") ||
    t.includes("money expected") ||
    t.includes("money still")
  ) {
    return pref.borrowLend
  }

  if (t.includes("payment")) {
    return pref.recurring
  }

  return false
}

/* ========================================
   SEND ONE NOTIFICATION
======================================== */

export async function deliverNotificationPush(
  userId: string,
  notificationId: string
) {
  const pref =
    await prisma.pushPreference.findUnique({
      where: {
        userId,
      },
    })

  /*
    Account has no registered push devices.
  */

  if (!pref?.enabled) {
    return
  }

  const notification =
    await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    })

  if (!notification) {
    return
  }

  /*
    Respect user's notification preferences.
  */

  if (!allowed(notification.title, pref)) {
    return
  }

  const subscriptions =
    await prisma.pushSubscription.findMany({
      where: {
        userId,
      },
    })

  if (!subscriptions.length) {
    return
  }

  const url =
    routeFor(notification.title)

  for (const sub of subscriptions) {
    /*
      Prevent duplicate delivery of the same
      notification to the same device.
    */

    const exists =
      await prisma.pushDelivery.findUnique({
        where: {
          notificationId_subscriptionId: {
            notificationId:
              notification.id,

            subscriptionId:
              sub.id,
          },
        },
      })

    if (exists) {
      continue
    }

    try {
      await adminMessaging().send({
        token: sub.token,

        notification: {
          title: notification.title,
          body: notification.body,
        },

        data: {
          title: notification.title,
          body: notification.body,
          url,
        },

        android: {
          priority: "high",

          notification: {
            channelId: "walletiq-default",
            sound: "default",
          },
        },
      })

      /*
        Record successful delivery.

        The same notification will therefore
        never be pushed twice to this device.
      */

      await prisma.pushDelivery.create({
        data: {
          userId,

          notificationId:
            notification.id,

          subscriptionId:
            sub.id,
        },
      })
    } catch (error: any) {
      console.error(
        "Push send error:",
        error?.code || error
      )

      /*
        Firebase says this token no longer
        belongs to a registered device.

        Remove it immediately.
      */

      if (
        [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token",
        ].includes(error?.code)
      ) {
        await prisma.pushSubscription.deleteMany({
          where: {
            id: sub.id,
          },
        })
      }
    }
  }

  /*
    If invalid subscriptions were removed,
    make sure account-level enabled state
    still reflects whether any device exists.
  */

  const remainingDevices =
    await prisma.pushSubscription.count({
      where: {
        userId,
      },
    })

  if (!remainingDevices) {
    await prisma.pushPreference.updateMany({
      where: {
        userId,
      },

      data: {
        enabled: false,
      },
    })
  }
}

/* ========================================
   SEND SPECIFIC NOTIFICATIONS
======================================== */

export async function deliverNotificationPushes(
  userId: string,
  notificationIds: string[]
) {
  /*
    Remove duplicate IDs before sending.
  */

  const uniqueIds =
    Array.from(
      new Set(notificationIds)
    )

  for (const notificationId of uniqueIds) {
    await deliverNotificationPush(
      userId,
      notificationId
    )
  }
}

/* ========================================
   DELIVER GENERAL PENDING PUSHES

   IMPORTANT:
   This is for cron/background processing.

   Do NOT use this after creating a single
   recurring payment because it intentionally
   scans pending notifications.
======================================== */

export async function deliverPendingPushes(
  userId: string
) {
  const pref =
    await prisma.pushPreference.findUnique({
      where: {
        userId,
      },
    })

  if (!pref?.enabled) {
    return
  }

  const subscriptions =
    await prisma.pushSubscription.findMany({
      where: {
        userId,
      },
    })

  if (!subscriptions.length) {
    return
  }

  /*
    Cron can process recently generated
    notifications.

    Individual API actions should use
    deliverNotificationPush() instead.
  */

  const since =
    new Date(
      Date.now() -
      36 * 60 * 60 * 1000
    )

  const notifications =
    await prisma.notification.findMany({
      where: {
        userId,

        createdAt: {
          gte: since,
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    })

  for (const notification of notifications) {
    if (
      !allowed(
        notification.title,
        pref
      )
    ) {
      continue
    }

    await deliverNotificationPush(
      userId,
      notification.id
    )
  }
}