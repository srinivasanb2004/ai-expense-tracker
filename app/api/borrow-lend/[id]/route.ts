import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const deleted = await prisma.borrowLend.deleteMany({ where: { id, userId } })
  if (!deleted.count) return NextResponse.json({ error: "Record not found." }, { status: 404 })

  return NextResponse.json({ success: true })
}
