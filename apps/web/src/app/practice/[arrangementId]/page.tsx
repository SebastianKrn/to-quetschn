import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireSessionFromHeaders, UnauthorizedError } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { PracticePlayer } from "@/components/practice/PracticePlayer";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  params
}: {
  params: {
    arrangementId: string;
  };
}) {
  let sessionUserId: string;

  try {
    const session = await requireSessionFromHeaders(new Headers(headers()));
    sessionUserId = session.user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/");
    }

    throw error;
  }

  const arrangement = await getDomainStore().getArrangement(params.arrangementId, sessionUserId);
  if (!arrangement) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <PracticePlayer arrangement={arrangement} />
    </main>
  );
}
