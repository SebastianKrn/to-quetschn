import { getWebEnv } from "@/lib/env";
import { jsonOk } from "@/lib/http";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const env = getWebEnv();

  return jsonOk({
    ok: true,
    arrangementId: context.params.id,
    export: {
      format: "pdf",
      status: "queued",
      storageEndpoint: env.OMR_SERVICE_URL
    }
  });
}
