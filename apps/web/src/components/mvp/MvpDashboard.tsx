"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TUNINGS,
  type ConversionJob,
  type ExportJob,
  type TransposeSuggestion,
  type Tuning
} from "@grifftab/domain-types";

const POLL_INTERVAL_MS = 2000;

interface ConversionState {
  job: ConversionJob;
  transposeSuggestions: TransposeSuggestion[];
}

interface ExportState {
  export: ExportJob;
  downloadUrl?: string;
}

function shouldPollConversion(status: ConversionJob["status"]): boolean {
  return status === "queued" || status === "processing";
}

function shouldPollExport(status: ExportJob["status"]): boolean {
  return status === "queued" || status === "processing";
}

export function MvpDashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTuning, setSelectedTuning] = useState<Tuning>("GCFB");
  const [devUserId, setDevUserId] = useState("dev-user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conversionState, setConversionState] = useState<ConversionState | null>(null);
  const [exportState, setExportState] = useState<ExportState | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    const trimmed = devUserId.trim();
    if (trimmed) {
      headers["x-dev-user-id"] = trimmed;
    }
    return headers;
  }, [devUserId]);

  const refreshConversion = useCallback(
    async (conversionId: string) => {
      const response = await fetch(`/api/conversions/${conversionId}`, {
        method: "GET",
        headers: authHeaders,
        cache: "no-store"
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Konvertierungsstatus konnte nicht geladen werden.");
      }

      const body = (await response.json()) as {
        ok: boolean;
        job: ConversionJob;
        transposeSuggestions: TransposeSuggestion[];
      };

      setConversionState({
        job: body.job,
        transposeSuggestions: body.transposeSuggestions ?? []
      });

      return body.job;
    },
    [authHeaders]
  );

  const refreshExport = useCallback(
    async (arrangementId: string) => {
      const response = await fetch(`/api/arrangements/${arrangementId}/export`, {
        method: "GET",
        headers: authHeaders,
        cache: "no-store"
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Exportstatus konnte nicht geladen werden.");
      }

      const body = (await response.json()) as {
        ok: boolean;
        export: ExportJob;
        download?: {
          url: string;
        };
      };

      setExportState({
        export: body.export,
        downloadUrl: body.download?.url
      });

      return body.export;
    },
    [authHeaders]
  );

  useEffect(() => {
    const conversionId = conversionState?.job.id;
    const status = conversionState?.job.status;
    if (!conversionId || !status || !shouldPollConversion(status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const job = await refreshConversion(conversionId);
        if (!shouldPollConversion(job.status)) {
          window.clearInterval(timer);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Polling der Konvertierung fehlgeschlagen.");
        window.clearInterval(timer);
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [conversionState?.job.id, conversionState?.job.status, refreshConversion]);

  useEffect(() => {
    const arrangementId = conversionState?.job.status === "completed" ? conversionState.job.id : null;
    const status = exportState?.export.status;
    if (!arrangementId || !status || !shouldPollExport(status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const job = await refreshExport(arrangementId);
        if (!shouldPollExport(job.status)) {
          window.clearInterval(timer);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Polling des Exports fehlgeschlagen.");
        window.clearInterval(timer);
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [conversionState, exportState?.export.status, refreshExport]);

  const startConversion = async () => {
    if (!selectedFile) {
      setMessage("Bitte zuerst eine PDF-Datei auswählen.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setConversionState(null);
    setExportState(null);

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("tuning", selectedTuning);

      const response = await fetch("/api/conversions", {
        method: "POST",
        body: formData,
        headers: authHeaders
      });

      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        job?: ConversionJob;
      };
      if (!response.ok || !body.job) {
        throw new Error(body.message ?? "Konvertierung konnte nicht gestartet werden.");
      }

      setConversionState({
        job: body.job,
        transposeSuggestions: []
      });
      setMessage("Konvertierung gestartet. Status wird automatisch aktualisiert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Konvertierung konnte nicht gestartet werden.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmTranspose = async (suggestion: TransposeSuggestion) => {
    const conversionId = conversionState?.job.id;
    if (!conversionId) {
      return;
    }

    try {
      const response = await fetch(`/api/conversions/${conversionId}/confirm-transpose`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          semitones: suggestion.semitones,
          targetKey: suggestion.targetKey
        })
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Transpositionsbestätigung fehlgeschlagen.");
      }

      setMessage(
        `Transposition ${suggestion.semitones > 0 ? "+" : ""}${suggestion.semitones} bestätigt, erneute Verarbeitung läuft.`
      );
      await refreshConversion(conversionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transposition konnte nicht bestätigt werden.");
    }
  };

  const triggerExport = async () => {
    const arrangementId = conversionState?.job.status === "completed" ? conversionState.job.id : null;
    if (!arrangementId) {
      return;
    }

    setIsExporting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/arrangements/${arrangementId}/export`, {
        method: "POST",
        headers: authHeaders
      });
      const body = (await response.json()) as {
        message?: string;
        export?: ExportJob;
      };
      if (!response.ok || !body.export) {
        throw new Error(body.message ?? "Export konnte nicht gestartet werden.");
      }

      setExportState({
        export: body.export
      });
      setMessage("Export gestartet. Status wird automatisch aktualisiert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export konnte nicht gestartet werden.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">GriffTab MVP Lauf</h1>
        <p className="mt-2 text-sm text-slate-700">
          PDF hochladen, Konvertierung beobachten, Transposition bestätigen, Praxis öffnen und PDF exportieren.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Lokal wird standardmäßig der Dev-Header genutzt. Für echten Login steht BetterAuth weiterhin bereit.
        </p>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-medium">PDF Datei</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            data-testid="conversion-file-input"
            onChange={(event) => {
              setSelectedFile(event.target.files?.item(0) ?? null);
            }}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-medium">Stimmung</span>
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={selectedTuning}
            data-testid="conversion-tuning-select"
            onChange={(event) => setSelectedTuning(event.target.value as Tuning)}
          >
            {TUNINGS.map((tuning) => (
              <option
                key={tuning}
                value={tuning}
              >
                {tuning}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-medium">Dev User ID</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={devUserId}
            data-testid="dev-user-id-input"
            onChange={(event) => setDevUserId(event.target.value)}
            placeholder="dev-user"
          />
        </label>
        <button
          type="button"
          onClick={startConversion}
          disabled={isSubmitting}
          data-testid="conversion-start-button"
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {isSubmitting ? "Konvertierung startet..." : "Konvertierung starten"}
        </button>
      </section>

      {message ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p>
      ) : null}

      {conversionState ? (
        <section
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          data-testid="conversion-section"
        >
          <h2 className="text-lg font-semibold text-slate-900">Konvertierungsstatus</h2>
          <dl className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-900">Job</dt>
              <dd data-testid="conversion-job-id-value">{conversionState.job.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Status</dt>
              <dd data-testid="conversion-status-value">{conversionState.job.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Fortschritt</dt>
              <dd data-testid="conversion-progress-value">{conversionState.job.progress}%</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Fehlercode</dt>
              <dd data-testid="conversion-error-value">{conversionState.job.errorCode ?? "-"}</dd>
            </div>
          </dl>

          {conversionState.job.status === "needs_transpose_confirmation" &&
          conversionState.transposeSuggestions.length > 0 ? (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold text-slate-900">Transposition bestätigen</h3>
              {conversionState.transposeSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.semitones}-${suggestion.targetKey}`}
                  type="button"
                  data-testid="transpose-confirm-button"
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => confirmTranspose(suggestion)}
                >
                  {suggestion.semitones > 0 ? "+" : ""}
                  {suggestion.semitones} Halbtonschritte → {suggestion.targetKey} (Score{" "}
                  {suggestion.playabilityScore})
                </button>
              ))}
            </div>
          ) : null}

          {conversionState.job.status === "completed" ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/practice/${conversionState.job.id}?devUserId=${encodeURIComponent(devUserId)}`}
                data-testid="practice-open-link"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Praxis öffnen
              </Link>
              <button
                type="button"
                onClick={triggerExport}
                disabled={isExporting}
                data-testid="export-start-button"
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
              >
                {isExporting ? "Export startet..." : "PDF Export starten"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {exportState ? (
        <section
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          data-testid="export-section"
        >
          <h2 className="text-lg font-semibold text-slate-900">Exportstatus</h2>
          <p className="mt-2 text-sm text-slate-700">
            <span data-testid="export-id-value">{exportState.export.id}</span>:{" "}
            <span data-testid="export-status-value">{exportState.export.status}</span>
          </p>
          {exportState.downloadUrl ? (
            <a
              href={exportState.downloadUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="export-download-link"
              className="mt-3 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              PDF herunterladen
            </a>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
