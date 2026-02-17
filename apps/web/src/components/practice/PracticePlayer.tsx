"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrangement } from "@grifftab/domain-types";
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
  type PracticeLoopRange,
  stepTempoByShortcut
} from "@/lib/practice";

export interface PracticePlayerProps {
  arrangement: Arrangement;
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

export function PracticePlayer({ arrangement }: PracticePlayerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const measureCount = Math.max(1, arrangement.measures.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempoBpm, setTempoBpm] = useState(clampTempoBpm(arrangement.tempoBpm));
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopRange, setLoopRange] = useState<PracticeLoopRange>({
    startMeasure: 1,
    endMeasure: measureCount
  });

  const measureOptions = useMemo(
    () => Array.from({ length: measureCount }, (_, index) => index + 1),
    [measureCount]
  );

  const svg = useMemo(() => {
    const renderer = new GriffschriftSvgRenderer();
    const svgHeight = Math.max(560, arrangement.measures.length * 120 + 180);
    return renderer.renderArrangement(arrangement, {
      width: 1080,
      height: svgHeight,
      showMeasureNumbers: true
    });
  }, [arrangement]);

  const scrollSpeed = useMemo(
    () =>
      getScrollSpeedPxPerSecond({
        arrangementTempoBpm: arrangement.tempoBpm,
        selectedTempoBpm: tempoBpm
      }),
    [arrangement.tempoBpm, tempoBpm]
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

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{arrangement.title}</h1>
          <p className="text-sm text-slate-600">Stimmung: {arrangement.tuning}</p>
        </div>
        <div className="text-sm text-slate-600">Standardtempo: {arrangement.tempoBpm} BPM</div>
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
          <div className="text-xs text-slate-500">
            {loopEnabled ? "Loop aktiv" : "Loop aus"}
          </div>
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

      <div
        ref={scrollRef}
        className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2"
      >
        <div
          className="mx-auto w-full max-w-[1080px]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </section>
  );
}
