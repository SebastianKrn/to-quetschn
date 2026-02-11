import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";
import { getWebEnv } from "./env";

type SessionLike = {
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

export const auth = betterAuth({
  appName: "GriffTab",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
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

function devSessionFromHeaders(request: Request): SessionLike | null {
  if (env.NODE_ENV === "production") {
    return null;
  }

  const userId = request.headers.get("x-dev-user-id");
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
      email: request.headers.get("x-dev-user-email") ?? `${userId}@local.dev`,
      name: request.headers.get("x-dev-user-name") ?? "Dev User"
    }
  };
}

export async function requireSession(request: Request): Promise<SessionLike> {
  const devSession = devSessionFromHeaders(request);
  if (devSession) {
    return devSession;
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers
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
