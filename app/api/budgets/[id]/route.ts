import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const session = await auth()

    const userId = (session?.user as any)
      ?.id as string | undefined

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      )
    }

    const { id } = await params

    const budget =
      await prisma.budget.findFirst({
        where: {
          id,
          userId,
        },
      })

    if (!budget) {
      return NextResponse.json(
        {
          error: "Budget not found",
        },
        {
          status: 404,
        }
      )
    }

    await prisma.budget.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({
      success: true,
      message:
        "Budget deleted successfully.",
    })
  } catch (error) {
    console.error(
      "Delete budget error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to delete budget.",
      },
      {
        status: 500,
      }
    )
  }
}