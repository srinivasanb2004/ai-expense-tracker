import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
async function uid(){const s=await auth();return (s?.user as any)?.id as string|undefined}
export async function GET(){const id=await uid();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});const user=await prisma.user.findUnique({where:{id},select:{name:true,email:true,createdAt:true}});return NextResponse.json(user)}
export async function PATCH(req:Request){const id=await uid();if(!id)return NextResponse.json({error:"Unauthorized"},{status:401});const b=await req.json();const name=String(b.name||"").trim();if(!name)return NextResponse.json({error:"Name is required."},{status:400});const user=await prisma.user.update({where:{id},data:{name},select:{name:true,email:true,createdAt:true}});return NextResponse.json(user)}
