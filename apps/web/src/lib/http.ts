import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonNotImplemented(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 501 });
}
