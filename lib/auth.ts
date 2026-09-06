import type { NextAuthOptions } from "next-auth";
import { decode as defaultJwtDecode } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { randomUUID } from "crypto";
import { getUserByEmailOrPhone, getCurrentSessionId, setCurrentSessionId } from "@/lib/db";
import type { UserRole } from "@/lib/types";
import { CONCURRENT_SESSION_ERROR } from "@/lib/auth-constants";

export { CONCURRENT_SESSION_ERROR };

export const DEV_ONLY_FALLBACK_SECRET = "local-dev-only-nextauth-secret-not-for-production";

/**
 * NextAuth requires a stable secret. If NEXTAUTH_SECRET is missing, NextAuth hashes the whole
 * config object — that hash changes on hot reload / edits and breaks existing session cookies
 * (JWEDecryptionFailed).
 *
 * Strict Production Safety:
 * - In production runtime, a non-fallback secret is strictly mandatory.
 * - The dev/build fallback is permitted only during development or static build collection.
 */
export function resolveNextAuthSecret(env: {
  NEXTAUTH_SECRET?: string;
  AUTH_SECRET?: string;
  NODE_ENV?: string;
  NEXT_PHASE?: string;
} = process.env): string {
  const fromEnv = env.NEXTAUTH_SECRET?.trim() || env.AUTH_SECRET?.trim();
  const isProduction = env.NODE_ENV === "production";
  const isBuildPhase = env.NEXT_PHASE === "phase-production-build";

  if (isProduction && !isBuildPhase) {
    if (!fromEnv || fromEnv === DEV_ONLY_FALLBACK_SECRET) {
      throw new Error(
        "NEXTAUTH_SECRET or AUTH_SECRET must be set to a secure secret in production. The dev-only fallback secret cannot be used at production runtime."
      );
    }
    return fromEnv;
  }

  if (fromEnv) return fromEnv;
  return DEV_ONLY_FALLBACK_SECRET;
}

const nextAuthSecret = resolveNextAuthSecret();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "البريد الإلكتروني أو رقم الهاتف", type: "text" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await getUserByEmailOrPhone(credentials.email);
        if (!user) return null;
        const ok = await compare(credentials.password, user.password_hash);
        if (!ok) return null;
        const existingSessionId = await getCurrentSessionId(user.id);
        if (existingSessionId != null && existingSessionId !== "") {
          throw new Error(CONCURRENT_SESSION_ERROR);
        }
        const sessionId = randomUUID();
        await setCurrentSessionId(user.id, sessionId);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: null,
          sessionId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role;
        token.sessionId = (user as { sessionId?: string }).sessionId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: UserRole }).role = token.role as UserRole;
        const { getCurrentSessionId: getSessionId } = await import("@/lib/db");
        const dbSessionId = await getSessionId((session.user as { id: string }).id);
        const sessionMismatch = !dbSessionId || dbSessionId.trim() === "" || dbSessionId !== token.sessionId;
        if (token.sessionId && sessionMismatch) {
          (session as { forceLogout?: boolean }).forceLogout = true;
        }
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: nextAuthSecret,
  jwt: {
    async decode(params) {
      try {
        return await defaultJwtDecode(params);
      } catch {
        // Stale cookie after secret rotation, or legacy token from unstable default secret
        return null;
      }
    },
  },
};
