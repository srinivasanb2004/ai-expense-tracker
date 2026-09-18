import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncNoteReminderNotifications } from "@/lib/notifications"
import { deliverNotificationPushes } from "@/lib/push"
import { after, NextResponse } from "next/server"

async function getUserId() {
  const session = await auth()
  return (session?.user as any)?.id as string | undefined
}

function serialize(note: any) {
  return {
    ...note,
    items: (note.items || []).sort((a: any, b: any) => a.position - b.position),
  }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const notes = await prisma.note.findMany({
    where: { userId },
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  })

  return NextResponse.json(notes.map(serialize))
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const requestedType = String(body.type || "TEXT").toUpperCase()
    const type = ["TEXT", "CHECKLIST", "REMINDER"].includes(requestedType) ? requestedType : "TEXT"

    const note = await prisma.note.create({
      data: {
        userId,
        type,
        title: body.title ? String(body.title) : null,
        content: body.content ? String(body.content) : null,
        pinned: typeof body.pinned === "boolean" ? body.pinned : false,
        archived: typeof body.archived === "boolean" ? body.archived : false,
        color: typeof body.color === "string" ? body.color : "default",
        tags: Array.isArray(body.tags)
          ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean).slice(0, 8)
          : [],
      },
      include: { items: true },
    })

    if (type === "REMINDER") {
      after(async () => {
        try {
          const notificationIds = await syncNoteReminderNotifications(userId, new Date(), {
            noteId: note.id,
          })

          if (notificationIds.length) {
            await deliverNotificationPushes(userId, notificationIds)
          }
        } catch (error) {
          console.error("Reminder notification sync error:", error)
        }
      })
    }

    return NextResponse.json(serialize(note), { status: 201 })
  } catch (error) {
    console.error("Create note error:", error)
    return NextResponse.json({ error: "Could not create note." }, { status: 500 })
  }
}
