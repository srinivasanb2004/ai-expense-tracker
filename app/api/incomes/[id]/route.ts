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

    const income =
      await prisma.income.findFirst({
        where: {
          id,
          userId,
        },
      })

    if (!income) {
      return NextResponse.json(
        {
          error: "Income not found",
        },
        {
          status: 404,
        }
      )
    }

    await prisma.income.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({
      success: true,
      message:
        "Income deleted successfully.",
    })
  } catch (error) {
    console.error(
      "Delete income error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to delete income.",
      },
      {
        status: 500,
      }
    )
  }
}