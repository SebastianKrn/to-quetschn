import { ConversionJobSchema } from "@grifftab/domain-types";
import { getWebEnv } from "@/lib/env";
import { jsonOk } from "@/lib/http";

export async function POST(request: Request) {
  const env = getWebEnv();
  const body = (await request.json().catch(() => ({}))) as {
    inputFileId?: string;
    tuning?: "GCFB" | "ADGC" | "BEADG" | "CFBB";
  };

  const now = new Date().toISOString();
  const job = ConversionJobSchema.parse({
    id: `job-${Date.now()}`,
    status: "queued",
    inputFileId: body.inputFileId ?? "unknown-input",
    tuning: body.tuning ?? "GCFB",
    progress: 0,
    errorCode: null,
    createdAt: now,
    updatedAt: now
  });

  return jsonOk({
    ok: true,
    provider: env.OMR_SERVICE_URL,
    job
  });
}
