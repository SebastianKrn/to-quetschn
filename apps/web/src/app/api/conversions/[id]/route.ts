import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
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

  const conversion = await getDomainStore().getConversion(context.params.id, sessionUserId);
  if (!conversion) {
    return jsonError(404, "Conversion not found");
  }

  return jsonOk({
    ok: true,
    job: conversion.job,
    transposeSuggestions: conversion.transposeSuggestions,
    confirmedTranspose: conversion.confirmedTranspose
  });
}
