import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
async function uid(){const s=await auth();return (s?.user as any)?.id as string|undefined}
export async function POST(req: Request){const userId=await uid();if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});const {token,userAgent}=await req.json();if(!token)return NextResponse.json({error:"Push token is required."},{status:400});const subscription=await prisma.pushSubscription.upsert({where:{token:String(token)},update:{userId,userAgent:userAgent?String(userAgent):null},create:{userId,token:String(token),userAgent:userAgent?String(userAgent):null}});await prisma.pushPreference.upsert({where:{userId},update:{enabled:true},create:{userId,enabled:true}});return NextResponse.json({success:true,id:subscription.id})}
export async function DELETE(req: Request){const userId=await uid();if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});const {token}=await req.json().catch(()=>({}));if(token)await prisma.pushSubscription.deleteMany({where:{userId,token:String(token)}});return NextResponse.json({success:true})}
