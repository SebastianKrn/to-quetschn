import { ConfirmTransposeRequestSchema } from "@grifftab/domain-types";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { getQueueClient } from "@/lib/queue";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request: Request, context: { params: { id: string } }) {
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
  const body = ConfirmTransposeRequestSchema.safeParse(bodyRaw);
  if (!body.success) {
    return jsonError(400, "Invalid transpose confirmation payload");
  }

  const conversion = await getDomainStore().confirmTranspose({
    id: context.params.id,
    semitones: body.data.semitones,
    targetKey: body.data.targetKey,
    ownerUserId: sessionUserId
  });

  if (!conversion) {
    return jsonError(404, "Conversion not found");
  }

  await getQueueClient().enqueueConversion({
    conversionId: conversion.job.id,
    sourceFileId: conversion.job.inputFileId,
    tuning: conversion.job.tuning,
    ownerUserId: sessionUserId,
    correlationId: `transpose-${conversion.job.id}-${Date.now()}`,
    transposeSemitones: body.data.semitones
  });

  return jsonOk({
    ok: true,
    conversionId: conversion.job.id,
    confirmedTranspose: body.data,
    status: conversion.job.status
  });
}
