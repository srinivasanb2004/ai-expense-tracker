import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

      authorize: async (credentials) => {
        if (
          !credentials?.email ||
          !credentials.password
        ) {
          return null
        }

        const user =
          await prisma.user.findUnique({
            where: {
              email: String(
                credentials.email
              ),
            },
          })

        if (!user) {
          return null
        }

        const validPassword =
          await bcrypt.compare(
            String(
              credentials.password
            ),
            user.password
          )

        if (!validPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({
      token,
      user,
      trigger,
      session,
    }) {
      // Initial login
      if (user?.id) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
      }

      // Profile updated from client
      if (trigger === "update") {
        if (session?.name) {
          token.name = session.name
        }
      }

      return token
    },

    async session({
      session,
      token,
    }) {
      if (session.user) {
        if (token.id) {
          ;(session.user as any).id =
            token.id
        }

        if (token.name) {
          session.user.name =
            String(token.name)
        }

        if (token.email) {
          session.user.email =
            String(token.email)
        }
      }

      return session
    },
  },
})