import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account }) {
      if (account) {
        token.access_token = account.access_token
        token.refresh_token = account.refresh_token
        token.expires_at = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      session.access_token = token.access_token as string | undefined
      session.refresh_token = token.refresh_token as string | undefined
      return session
    },
  },
})

declare module 'next-auth' {
  interface Session {
    access_token?: string
    refresh_token?: string
  }
}
