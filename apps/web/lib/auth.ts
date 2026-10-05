import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const emailEnabled = Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM);
/** Passwordless demo login for local development only. Never active in production builds. */
export const devLoginEnabled = process.env.AUTH_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

const providers: NextAuthConfig["providers"] = [];
if (googleEnabled) providers.push(Google({ allowDangerousEmailAccountLinking: false }));
if (emailEnabled) providers.push(Nodemailer({ server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM }));
if (devLoginEnabled) {
  providers.push(Credentials({
    id: "dev", name: "Dev login", credentials: { email: {} },
    authorize: async (c) => {
      const email = String(c?.email ?? "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
      return db.user.upsert({ where: { email }, update: {}, create: { email, name: email.split("@")[0], emailVerified: new Date() } });
    },
  }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 3600 },
  providers,
  trustHost: true,
  pages: { signIn: "/login" },
  callbacks: {
    jwt: ({ token, user }) => { if (user?.id) token.uid = user.id; return token; },
    session: ({ session, token }) => { if (token.uid) session.user.id = String(token.uid); return session; },
  },
});

/** The signed-in user (fresh from the database, so plan changes apply immediately) or null. */
export async function currentUser() {
  const s = await auth();
  return s?.user?.id ? db.user.findUnique({ where: { id: s.user.id } }) : null;
}
