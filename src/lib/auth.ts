import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Okta from "next-auth/providers/okta";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env, ssoEnabled } from "./env";
import { allow } from "./ratelimit";
import { clientIpFromHeaders } from "./audit";

// Providers are assembled dynamically: credentials is always present (seeded
// admin) and each SSO provider lights up only when its env vars are set.
const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email & password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (creds, request) => {
      const email = String(creds?.email ?? "").toLowerCase().trim();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      // Brute-force / credential-stuffing protection: cap attempts per IP+email.
      const ip = request instanceof Request ? clientIpFromHeaders(request.headers) || "unknown" : "unknown";
      if (!allow(`login:${ip}:${email}`, 10, 5 * 60_000)) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash || !user.isActive) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
  }),
];

if (ssoEnabled.okta) {
  providers.push(
    Okta({
      clientId: env.OKTA_CLIENT_ID,
      clientSecret: env.OKTA_CLIENT_SECRET,
      issuer: env.OKTA_ISSUER,
    }),
  );
}
if (ssoEnabled.google) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  secret: env.AUTH_SECRET,
  pages: { signIn: "/admin/login" },
  providers,
  callbacks: {
    // SSO users must be provisioned (and active) by an admin first; credentials
    // are already validated in authorize().
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const db = await prisma.user.findUnique({ where: { email } });
      return Boolean(db && db.isActive);
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.uid = user.id;
      } else if (token.email && !token.role) {
        const db = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (db) {
          token.role = db.role;
          token.uid = db.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = token.role as
          | "OWNER"
          | "ADMIN"
          | "VIEWER"
          | undefined;
      }
      return session;
    },
  },
});
