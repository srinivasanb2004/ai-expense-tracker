import { prisma } from "@/lib/prisma"
import { syncAllNotifications } from "@/lib/notifications"
import { deliverPendingPushes } from "@/lib/push"
import { NextResponse } from "next/server"
export async function GET(req:Request){const secret=process.env.CRON_SECRET;const header=req.headers.get("authorization");if(!secret||header!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});const users=await prisma.pushPreference.findMany({where:{enabled:true},select:{userId:true}});let processed=0;for(const {userId} of users){try{await syncAllNotifications(userId);await deliverPendingPushes(userId);processed++}catch(e){console.error("Push cron user error",userId,e)}}return NextResponse.json({success:true,processed})}
