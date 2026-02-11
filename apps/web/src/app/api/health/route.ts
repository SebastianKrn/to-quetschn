import { getWebEnv } from "@/lib/env";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const env = getWebEnv();
  return jsonOk({
    ok: true,
    service: "web",
    env: env.NODE_ENV,
    publicSharingEnabled: env.FEATURE_PUBLIC_SHARING === "true"
  });
}
