import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

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
    const type = String(body.type || "TEXT").toUpperCase() === "CHECKLIST" ? "CHECKLIST" : "TEXT"

    const note = await prisma.note.create({
      data: {
        userId,
        type,
        title: body.title ? String(body.title) : null,
        content: body.content ? String(body.content) : null,
      },
      include: { items: true },
    })

    return NextResponse.json(serialize(note), { status: 201 })
  } catch (error) {
    console.error("Create note error:", error)
    return NextResponse.json({ error: "Could not create note." }, { status: 500 })
  }
}
