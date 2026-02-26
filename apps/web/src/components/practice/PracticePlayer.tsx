"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Arrangement, GriffDirection, GriffToken } from "@grifftab/domain-types";
import { GriffschriftSvgRenderer } from "@grifftab/renderer-svg";
import {
  clampTempoBpm,
  formatTempoLabel,
  getLoopScrollBounds,
  getResetScrollTop,
  getScrollSpeedPxPerSecond,
  MAX_PRACTICE_TEMPO_BPM,
  MIN_PRACTICE_TEMPO_BPM,
  normalizeLoopRange,
  stepTempoByShortcut,
  type PracticeLoopRange
} from "@/lib/practice";

export interface PracticePlayerProps {
  arrangement: Arrangement;
  devUserId?: string;
}

interface TokenPatchDraft {
  tokenId: string;
  row: number;
  button: number;
  direction: GriffDirection;
}

function shouldIgnoreKeyboardShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "select" || tagName === "textarea") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return target.closest("[contenteditable='true']") !== null;
}

function findToken(arrangement: Arrangement, tokenId: string): GriffToken | null {
  for (const measure of arrangement.measures) {
    for (const token of measure.tokens) {
      if (token.id === tokenId) {
        return token;
      }
    }
  }

  return null;
}

export function PracticePlayer({ arrangement, devUserId }: PracticePlayerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [currentArrangement, setCurrentArrangement] = useState(arrangement);
  const measureCount = Math.max(1, currentArrangement.measures.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempoBpm, setTempoBpm] = useState(clampTempoBpm(currentArrangement.tempoBpm));
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopRange, setLoopRange] = useState<PracticeLoopRange>({
    startMeasure: 1,
    endMeasure: measureCount
  });
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [tokenPatchDraft, setTokenPatchDraft] = useState<TokenPatchDraft | null>(null);
  const [patchState, setPatchState] = useState<{
    isSaving: boolean;
    message: string | null;
  }>({
    isSaving: false,
    message: null
  });

  const selectedToken = useMemo(() => {
    if (!selectedTokenId) {
      return null;
    }

    return findToken(currentArrangement, selectedTokenId);
  }, [currentArrangement, selectedTokenId]);

  useEffect(() => {
    setCurrentArrangement(arrangement);
  }, [arrangement]);

  useEffect(() => {
    if (!selectedToken) {
      setTokenPatchDraft(null);
      return;
    }

    setTokenPatchDraft({
      tokenId: selectedToken.id,
      row: selectedToken.row,
      button: selectedToken.button,
      direction: selectedToken.direction
    });
  }, [selectedToken]);

  const measureOptions = useMemo(
    () => Array.from({ length: measureCount }, (_, index) => index + 1),
    [measureCount]
  );

  const svg = useMemo(() => {
    const renderer = new GriffschriftSvgRenderer();
    const svgHeight = Math.max(560, currentArrangement.measures.length * 120 + 180);
    return renderer.renderArrangement(currentArrangement, {
      width: 1080,
      height: svgHeight,
      showMeasureNumbers: true
    });
  }, [currentArrangement]);

  const scrollSpeed = useMemo(
    () =>
      getScrollSpeedPxPerSecond({
        arrangementTempoBpm: currentArrangement.tempoBpm,
        selectedTempoBpm: tempoBpm
      }),
    [currentArrangement.tempoBpm, tempoBpm]
  );

  useEffect(() => {
    setLoopRange((current) =>
      normalizeLoopRange({
        range: current,
        measureCount
      })
    );
  }, [measureCount]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let animationFrame = 0;
    let lastTs: number | null = null;

    const step = (timestamp: number) => {
      if (!scrollRef.current) {
        return;
      }

      if (lastTs === null) {
        lastTs = timestamp;
      }

      const deltaSeconds = (timestamp - lastTs) / 1000;
      lastTs = timestamp;

      const maxScrollTop = Math.max(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight);
      const bounds = loopEnabled
        ? getLoopScrollBounds({
            range: loopRange,
            measureCount,
            maxScrollTop
          })
        : { startPx: 0, endPx: maxScrollTop };

      if (loopEnabled && scrollRef.current.scrollTop < bounds.startPx) {
        scrollRef.current.scrollTop = bounds.startPx;
      }

      const nextScrollTop = scrollRef.current.scrollTop + scrollSpeed * deltaSeconds;
      if (nextScrollTop >= bounds.endPx) {
        if (loopEnabled && bounds.endPx > bounds.startPx) {
          scrollRef.current.scrollTop = bounds.startPx;
          animationFrame = requestAnimationFrame(step);
          return;
        }

        scrollRef.current.scrollTop = maxScrollTop;
        setIsPlaying(false);
        return;
      }

      scrollRef.current.scrollTop = nextScrollTop;
      animationFrame = requestAnimationFrame(step);
    };

    animationFrame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, loopEnabled, loopRange, measureCount, scrollSpeed]);

  const handleTempoChange = (value: number) => {
    setTempoBpm(clampTempoBpm(value));
  };

  const handleLoopBoundaryChange = (boundary: "startMeasure" | "endMeasure", value: number) => {
    setLoopRange((current) =>
      normalizeLoopRange({
        range: {
          ...current,
          [boundary]: value
        },
        measureCount
      })
    );
  };

  const resetScroll = useCallback(() => {
    if (scrollRef.current) {
      const maxScrollTop = Math.max(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight);
      scrollRef.current.scrollTop = getResetScrollTop({
        loopEnabled,
        loopRange,
        measureCount,
        maxScrollTop
      });
    }
    setIsPlaying(false);
  }, [loopEnabled, loopRange, measureCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardShortcut(event.target)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((current) => !current);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        resetScroll();
        return;
      }

      if (key === "l") {
        event.preventDefault();
        setLoopEnabled((current) => !current);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setTempoBpm((current) =>
          stepTempoByShortcut({
            currentTempoBpm: current,
            direction: "up"
          })
        );
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setTempoBpm((current) =>
          stepTempoByShortcut({
            currentTempoBpm: current,
            direction: "down"
          })
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [resetScroll]);

  const onSvgClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const tokenElement = target.closest("[data-token-id]");
    const tokenId = tokenElement?.getAttribute("data-token-id");
    if (!tokenId) {
      return;
    }

    setSelectedTokenId(tokenId);
    setPatchState({
      isSaving: false,
      message: `Griff ${tokenId} ausgewählt.`
    });
  };

  const saveTokenPatch = async () => {
    if (!tokenPatchDraft) {
      return;
    }

    setPatchState({
      isSaving: true,
      message: null
    });

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json"
      };
      if (devUserId?.trim()) {
        headers["x-dev-user-id"] = devUserId.trim();
      }

      const response = await fetch(`/api/arrangements/${currentArrangement.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          tokenId: tokenPatchDraft.tokenId,
          row: Math.max(1, Math.round(tokenPatchDraft.row)),
          button: Math.max(1, Math.round(tokenPatchDraft.button)),
          direction: tokenPatchDraft.direction
        })
      });

      const body = (await response.json()) as {
        message?: string;
        arrangement?: Arrangement;
      };
      if (!response.ok || !body.arrangement) {
        throw new Error(body.message ?? "Token konnte nicht gespeichert werden.");
      }

      setCurrentArrangement(body.arrangement);
      setPatchState({
        isSaving: false,
        message: "Token wurde gespeichert."
      });
    } catch (error) {
      setPatchState({
        isSaving: false,
        message: error instanceof Error ? error.message : "Token konnte nicht gespeichert werden."
      });
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{currentArrangement.title}</h1>
          <p className="text-sm text-slate-600">Stimmung: {currentArrangement.tuning}</p>
        </div>
        <div className="text-sm text-slate-600">Standardtempo: {currentArrangement.tempoBpm} BPM</div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-medium">Tempo</span>
          <input
            type="range"
            min={MIN_PRACTICE_TEMPO_BPM}
            max={MAX_PRACTICE_TEMPO_BPM}
            value={tempoBpm}
            onChange={(event) => handleTempoChange(Number(event.target.value))}
          />
          <span className="font-semibold text-slate-900">{formatTempoLabel(tempoBpm)}</span>
        </label>

        <div className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Loop</span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Von Takt</span>
              <select
                value={loopRange.startMeasure}
                onChange={(event) => handleLoopBoundaryChange("startMeasure", Number(event.target.value))}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                {measureOptions.map((measure) => (
                  <option
                    key={`loop-start-${measure}`}
                    value={measure}
                  >
                    {measure}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Bis Takt</span>
              <select
                value={loopRange.endMeasure}
                onChange={(event) => handleLoopBoundaryChange("endMeasure", Number(event.target.value))}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                {measureOptions.map((measure) => (
                  <option
                    key={`loop-end-${measure}`}
                    value={measure}
                  >
                    {measure}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="text-xs text-slate-500">{loopEnabled ? "Loop aktiv" : "Loop aus"}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((current) => !current)}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            {isPlaying ? "Pause" : "Abspielen"}
          </button>
          <button
            type="button"
            onClick={() => setLoopEnabled((current) => !current)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              loopEnabled
                ? "border border-brand-700 bg-brand-100 text-brand-900"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {loopEnabled ? "Loop beenden" : "Loop aktivieren"}
          </button>
          <button
            type="button"
            onClick={resetScroll}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Zum Anfang
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Kurzbefehle: Leertaste (Start/Pause), L (Loop), R (Zurücksetzen), Pfeil hoch/runter (Tempo).
      </p>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h2 className="text-sm font-semibold text-slate-900">Token-Korrektur</h2>
        <p className="mt-1 text-xs text-slate-600">
          Einen Griff direkt im SVG anklicken und anschließend Reihe, Knopf und Balgrichtung anpassen.
        </p>

        {selectedToken && tokenPatchDraft ? (
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <label className="flex flex-col gap-1 text-xs text-slate-700">
              <span>Reihe</span>
              <input
                type="number"
                min={1}
                data-testid="token-row-input"
                value={tokenPatchDraft.row}
                onChange={(event) =>
                  setTokenPatchDraft((current) =>
                    current
                      ? {
                          ...current,
                          row: Number(event.target.value)
                        }
                      : current
                  )
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-700">
              <span>Knopf</span>
              <input
                type="number"
                min={1}
                data-testid="token-button-input"
                value={tokenPatchDraft.button}
                onChange={(event) =>
                  setTokenPatchDraft((current) =>
                    current
                      ? {
                          ...current,
                          button: Number(event.target.value)
                        }
                      : current
                  )
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-slate-700">
              <span>Balgrichtung</span>
              <select
                value={tokenPatchDraft.direction}
                data-testid="token-direction-select"
                onChange={(event) =>
                  setTokenPatchDraft((current) =>
                    current
                      ? {
                          ...current,
                          direction: event.target.value as GriffDirection
                        }
                      : current
                  )
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="push">Druck (push)</option>
                <option value="pull">Zug (pull)</option>
              </select>
            </label>

            <button
              type="button"
              onClick={saveTokenPatch}
              disabled={patchState.isSaving}
              data-testid="token-save-button"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {patchState.isSaving ? "Speichert..." : "Token speichern"}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-600">Noch kein Token ausgewählt.</p>
        )}

        {patchState.message ? (
          <p
            className="mt-2 text-xs text-slate-600"
            data-testid="token-patch-message"
          >
            {patchState.message}
          </p>
        ) : null}
      </section>

      <div
        ref={scrollRef}
        data-testid="practice-svg-container"
        className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2"
      >
        <div
          className="mx-auto w-full max-w-[1080px] cursor-pointer"
          onClick={onSvgClick}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </section>
  );
}
