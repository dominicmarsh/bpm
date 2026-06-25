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

      // Refresh if expired (or within 60s of expiry)
      const expiresAt = token.expires_at as number | undefined
      if (expiresAt && Date.now() / 1000 > expiresAt - 60 && token.refresh_token) {
        try {
          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refresh_token as string,
            }),
          })
          const refreshed = await res.json()
          if (refreshed.access_token) {
            token.access_token = refreshed.access_token
            token.expires_at = Math.floor(Date.now() / 1000) + (refreshed.expires_in as number ?? 3600)
          }
        } catch {
          // Keep old token on refresh failure — let the API call fail naturally
        }
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
