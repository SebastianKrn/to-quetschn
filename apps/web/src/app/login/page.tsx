"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          callbackURL: "/"
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Anmeldung fehlgeschlagen.");
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Anmelden</h1>
        <p className="mt-2 text-sm text-slate-700">Melde dich mit deinem Testkonto an.</p>

        <form
          className="mt-5 space-y-4"
          onSubmit={onSubmit}
        >
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-medium">E-Mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-medium">Passwort</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {isSubmitting ? "Anmeldung läuft..." : "Anmelden"}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-slate-600">
          Noch kein Konto?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-700 hover:text-brand-500"
          >
            Jetzt registrieren
          </Link>
        </p>
      </section>
    </main>
  );
}
