import { ArrangementSchema } from "@grifftab/domain-types";
import { jsonOk } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const arrangement = ArrangementSchema.parse({
    id: context.params.id,
    title: "Arrangement Stub",
    tuning: "GCFB",
    tempoBpm: 80,
    measures: [],
    metadata: {
      source: "stub"
    }
  });

  return jsonOk({ ok: true, arrangement });
}
