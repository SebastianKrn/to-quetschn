import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MvpDashboard } from "@/components/mvp/MvpDashboard";
import { getWebEnv } from "@/lib/env";
import { requireSessionFromHeaders, UnauthorizedError } from "@/lib/auth";

export default async function HomePage() {
  const env = getWebEnv();
  const allowDevHeaderAuth = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  let sessionUserId: string | null = null;

  if (!allowDevHeaderAuth) {
    try {
      const session = await requireSessionFromHeaders(new Headers(headers()));
      sessionUserId = session.user.id;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        redirect("/login");
      }
      throw error;
    }
  }

  return (
    <MvpDashboard
      allowDevHeaderAuth={allowDevHeaderAuth}
      sessionUserId={sessionUserId}
      pilotMode={env.PILOT_MODE === "true"}
      enforceRightsConfirmation={env.ENFORCE_UPLOAD_RIGHTS_CONFIRMATION === "true"}
    />
  );
}
