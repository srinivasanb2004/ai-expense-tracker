import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
async function uid(){const s=await auth();return (s?.user as any)?.id as string|undefined}
export async function GET(){const userId=await uid();if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});const p=await prisma.pushPreference.findUnique({where:{userId}});return NextResponse.json(p||{enabled:false,recurring:true,borrowLend:true,budgets:true,overdue:true})}
export async function PATCH(req:Request){const userId=await uid();if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});const b=await req.json();const data={enabled:b.enabled!==false,recurring:b.recurring!==false,borrowLend:b.borrowLend!==false,budgets:b.budgets!==false,overdue:b.overdue!==false};const p=await prisma.pushPreference.upsert({where:{userId},update:data,create:{userId,...data}});return NextResponse.json(p)}
