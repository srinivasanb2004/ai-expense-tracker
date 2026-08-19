import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncAllNotifications } from "@/lib/notifications"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await syncAllNotifications(userId)

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({
    notifications,
    unread: notifications.filter((item) => !item.read).length,
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body.id) {
    await prisma.notification.updateMany({ where: { id: String(body.id), userId }, data: { read: true } })
  } else {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  }

  return NextResponse.json({ success: true })
}
