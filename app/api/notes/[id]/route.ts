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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const existing = await prisma.note.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: "Note not found." }, { status: 404 })

    const data: any = {}
    if (typeof body.title === "string" || body.title === null) data.title = body.title || null
    if (typeof body.content === "string" || body.content === null) data.content = body.content || null
    if (typeof body.pinned === "boolean") data.pinned = body.pinned
    if (typeof body.archived === "boolean") data.archived = body.archived
    if (typeof body.color === "string") data.color = body.color
    if (Array.isArray(body.tags)) data.tags = body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean).slice(0, 8)

    if (Array.isArray(body.items)) {
      await prisma.$transaction(async (tx) => {
        await tx.note.update({ where: { id }, data })
        await tx.noteItem.deleteMany({ where: { noteId: id } })
        if (body.items.length) {
          await tx.noteItem.createMany({
            data: body.items
              .map((item: any, index: number) => ({
                noteId: id,
                text: String(item.text || "").trim(),
                checked: Boolean(item.checked),
                position: index,
              }))
              .filter((item: any) => item.text),
          })
        }
      })
    } else {
      await prisma.note.update({ where: { id }, data })
    }

    const updated = await prisma.note.findFirst({
      where: { id, userId },
      include: { items: { orderBy: { position: "asc" } } },
    })

    return NextResponse.json(serialize(updated))
  } catch (error) {
    console.error("Update note error:", error)
    return NextResponse.json({ error: "Could not update note." }, { status: 500 })
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const deleted = await prisma.note.deleteMany({ where: { id, userId } })
  if (!deleted.count) return NextResponse.json({ error: "Note not found." }, { status: 404 })
  return NextResponse.json({ success: true })
}
