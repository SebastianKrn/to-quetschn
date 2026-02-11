import { jsonOk } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    semitones?: number;
    targetKey?: string;
  };

  return jsonOk({
    ok: true,
    conversionId: context.params.id,
    confirmedTranspose: {
      semitones: body.semitones ?? 0,
      targetKey: body.targetKey ?? "original"
    }
  });
}
