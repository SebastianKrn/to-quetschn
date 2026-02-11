import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    await requireSession(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, error.message);
    }

    return jsonError(401, "Not authenticated");
  }

  const arrangement = await getDomainStore().getArrangement(context.params.id);
  if (!arrangement) {
    return jsonError(404, "Arrangement not found");
  }

  return jsonOk({ ok: true, arrangement });
}
