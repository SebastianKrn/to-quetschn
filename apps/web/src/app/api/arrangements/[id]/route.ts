import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { UpdateArrangementTokenRequestSchema } from "@grifftab/domain-types";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request, context: { params: { id: string } }) {
  let sessionUserId: string;
  try {
    const session = await requireSession(request);
    sessionUserId = session.user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, error.message);
    }

    return jsonError(401, "Not authenticated");
  }

  const arrangement = await getDomainStore().getArrangement(context.params.id, sessionUserId);
  if (!arrangement) {
    return jsonError(404, "Arrangement not found");
  }

  return jsonOk({ ok: true, arrangement });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  let sessionUserId: string;
  try {
    const session = await requireSession(request);
    sessionUserId = session.user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, error.message);
    }

    return jsonError(401, "Not authenticated");
  }

  const bodyRaw = (await request.json().catch(() => ({}))) as unknown;
  const parsed = UpdateArrangementTokenRequestSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return jsonError(400, "Invalid arrangement patch payload", {
      issues: parsed.error.issues.map((issue) => issue.message)
    });
  }

  const updatedArrangement = await getDomainStore().updateArrangementToken({
    arrangementId: context.params.id,
    ownerUserId: sessionUserId,
    tokenId: parsed.data.tokenId,
    row: parsed.data.row,
    button: parsed.data.button,
    direction: parsed.data.direction
  });

  if (!updatedArrangement) {
    return jsonError(404, "Arrangement or token not found");
  }

  return jsonOk({
    ok: true,
    arrangement: updatedArrangement
  });
}
