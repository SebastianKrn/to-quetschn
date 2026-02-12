import { randomUUID } from "node:crypto";
import { requireSession, UnauthorizedError, type SessionLike } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { getQueueClient } from "@/lib/queue";
import { getStorageClient } from "@/lib/storage";
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

export async function POST(request: Request, context: { params: { id: string } }) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  const session = authResult;

  const arrangement = await getDomainStore().getArrangement(context.params.id, session.user.id);
  if (!arrangement) {
    return jsonError(404, "Arrangement not found");
  }

  const correlationId = randomUUID();
  const requested = await getDomainStore().requestLatestExport({
    arrangementId: arrangement.id,
    correlationId,
    ownerUserId: session.user.id
  });

  let queueJobId: string | null = null;
  if (requested.shouldEnqueue) {
    const queued = await getQueueClient().enqueueExport({
      exportId: requested.job.id,
      arrangementId: arrangement.id,
      ownerUserId: session.user.id,
      correlationId
    });
    queueJobId = queued.id;
  }

  return jsonOk({
    ok: true,
    arrangementId: arrangement.id,
    export: requested.job,
    enqueued: requested.shouldEnqueue,
    queueJobId
  });
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  const session = authResult;

  const latestExport = await getDomainStore().getLatestExportByArrangement(
    context.params.id,
    session.user.id
  );
  if (!latestExport) {
    return jsonError(404, "Export not found");
  }

  if (latestExport.status === "completed" && latestExport.artifactKey) {
    const expiresInSeconds = 15 * 60;
    const signed = await getStorageClient().getSignedUrl({
      key: latestExport.artifactKey,
      expiresInSeconds
    });

    return jsonOk({
      ok: true,
      export: latestExport,
      download: {
        url: signed.url,
        expiresInSeconds
      }
    });
  }

  return jsonOk({
    ok: true,
    export: latestExport
  });
}
