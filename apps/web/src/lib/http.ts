import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      message,
      details
    },
    { status }
  );
}
