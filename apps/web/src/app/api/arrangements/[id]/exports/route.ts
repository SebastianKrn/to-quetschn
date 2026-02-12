import { ListArrangementExportsQuerySchema } from "@grifftab/domain-types";
import { requireSession, UnauthorizedError, type SessionLike } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { jsonError, jsonOk } from "@/lib/http";

async function requireAuth(request: Request): Promise<SessionLike | Response> {
  try {
    return await requireSession(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, error.message);
    }

    return jsonError(401, "Not authenticated");
  }
}

function parseListQuery(request: Request): { limit?: number } | Response {
  const params = new URL(request.url).searchParams;
  const rawLimit = params.get("limit");
  const parsed = ListArrangementExportsQuerySchema.safeParse({
    limit: rawLimit ? Number(rawLimit) : undefined
  });

  if (!parsed.success) {
    return jsonError(400, "Invalid exports query", {
      issues: parsed.error.issues.map((issue) => issue.message)
    });
  }

  return {
    limit: parsed.data.limit
  };
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const query = parseListQuery(request);
  if (query instanceof Response) {
    return query;
  }

  const exports = await getDomainStore().listExportsByArrangement(
    context.params.id,
    authResult.user.id,
    query.limit
  );

  return jsonOk({
    ok: true,
    exports
  });
}
