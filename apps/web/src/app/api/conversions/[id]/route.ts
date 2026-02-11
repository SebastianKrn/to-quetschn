import { ConversionJobSchema } from "@grifftab/domain-types";
import { jsonOk } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const now = new Date().toISOString();
  const job = ConversionJobSchema.parse({
    id: context.params.id,
    status: "processing",
    inputFileId: "stub-input",
    tuning: "GCFB",
    progress: 25,
    errorCode: null,
    createdAt: now,
    updatedAt: now
  });

  return jsonOk({ ok: true, job });
}
