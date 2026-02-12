import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";
import { getWebEnv } from "./env";

export type SessionLike = {
  session: {
    id: string;
    userId: string;
  };
  user: {
    id: string;
    email?: string;
    name?: string;
  };
};

const env = getWebEnv();

const globalScope = globalThis as unknown as {
  __grifftabAuthPool?: Pool;
};

const pool =
  globalScope.__grifftabAuthPool ??
  new Pool({
    connectionString: env.DATABASE_URL
  });

if (!globalScope.__grifftabAuthPool) {
  globalScope.__grifftabAuthPool = pool;
}

const database =
  env.NODE_ENV === "test"
    ? memoryAdapter({})
    : new PostgresDialect({
        pool
      });

function parseTrustedOrigins(): string[] {
  const dynamicOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set([env.APP_BASE_URL, env.BETTER_AUTH_URL, ...dynamicOrigins]));
}

export const auth = betterAuth({
  appName: "GriffTab",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: parseTrustedOrigins(),
  database,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "staging" || env.NODE_ENV === "production"
  },
  plugins: [nextCookies()]
});

export const authRouteHandlers = toNextJsHandler(auth);

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function devSessionFromHeaders(headers: Headers): SessionLike | null {
  if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") {
    return null;
  }

  const userId = headers.get("x-dev-user-id");
  if (!userId) {
    return null;
  }

  return {
    session: {
      id: `dev-session-${userId}`,
      userId
    },
    user: {
      id: userId,
      email: headers.get("x-dev-user-email") ?? `${userId}@local.dev`,
      name: headers.get("x-dev-user-name") ?? "Dev User"
    }
  };
}

export async function requireSessionFromHeaders(headers: Headers): Promise<SessionLike> {
  const devSession = devSessionFromHeaders(headers);
  if (devSession) {
    return devSession;
  }

  try {
    const session = await auth.api.getSession({
      headers
    });

    if (!session) {
      throw new UnauthorizedError();
    }

    return session as SessionLike;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError("Session verification failed");
  }
}

export async function requireSession(request: Request): Promise<SessionLike> {
  return requireSessionFromHeaders(request.headers);
}
