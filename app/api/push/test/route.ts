import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { adminMessaging } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"
export async function POST(){const s=await auth();const userId=(s?.user as any)?.id as string|undefined;if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});const subs=await prisma.pushSubscription.findMany({where:{userId}});if(!subs.length)return NextResponse.json({error:"Enable push notifications on this device first."},{status:400});let sent=0;for(const sub of subs){try{await adminMessaging().send({token:sub.token,data:{title:"WalletIQ test notification",body:"Push notifications are working on this device.",url:"/settings"}});sent++}catch(e){console.error(e)}}return NextResponse.json({success:sent>0,sent},{status:sent?200:500})}
