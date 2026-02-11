import { ApiContracts, QueueTopics, TUNINGS } from "@grifftab/domain-types";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold text-brand-700">GriffTab Foundation</h1>
      <p className="text-slate-700">
        Contract-first scaffold for Standard notation to Griffschrift conversion.
      </p>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Tunings</h2>
        <pre className="overflow-auto rounded bg-slate-50 p-3 text-sm">
          {JSON.stringify(TUNINGS, null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">API Contracts</h2>
        <pre className="overflow-auto rounded bg-slate-50 p-3 text-sm">
          {JSON.stringify(ApiContracts, null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Queue Topics</h2>
        <pre className="overflow-auto rounded bg-slate-50 p-3 text-sm">
          {JSON.stringify(QueueTopics, null, 2)}
        </pre>
      </section>
    </main>
  );
}
