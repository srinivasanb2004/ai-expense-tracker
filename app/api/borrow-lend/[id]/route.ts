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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params; const b = await req.json(); const amount = Number(b.amount)
  const existing = await prisma.borrowLend.findFirst({ where: { id, userId }, include: { repayments: true } })
  if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 })
  const repaid = existing.repayments.reduce((s,r)=>s+Number(r.amount),0)
  if (!b.person || !["BORROWED","LENT"].includes(String(b.type)) || !Number.isFinite(amount) || amount <= 0 || amount < repaid) return NextResponse.json({ error: "Enter valid details. Amount cannot be below already repaid value." }, { status: 400 })
  const startDate=new Date(b.startDate); const dueDate=b.dueDate?new Date(b.dueDate):null
  if(dueDate && dueDate<startDate)return NextResponse.json({error:"Due date cannot be before the start date."},{status:400})
  const x = await prisma.borrowLend.update({ where: { id }, data: { person:String(b.person).trim(), phone:b.phone?String(b.phone).trim():null, type:String(b.type), amount, startDate, dueDate, notes:b.notes?String(b.notes):null }, include:{repayments:{orderBy:{date:"desc"}}} })
  const paid=x.repayments.reduce((sum,r)=>sum+Number(r.amount),0)
  return NextResponse.json({ ...x, amount:Number(x.amount), repaid:paid, remaining:Math.max(Number(x.amount)-paid,0), repayments:x.repayments.map(r=>({...r,amount:Number(r.amount)})) })
}
