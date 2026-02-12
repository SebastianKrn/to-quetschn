"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Arrangement } from "@grifftab/domain-types";
import { GriffschriftSvgRenderer } from "@grifftab/renderer-svg";
import {
  clampTempoBpm,
  formatTempoLabel,
  getScrollSpeedPxPerSecond,
  MAX_PRACTICE_TEMPO_BPM,
  MIN_PRACTICE_TEMPO_BPM
} from "@/lib/practice";

export interface PracticePlayerProps {
  arrangement: Arrangement;
}

export function PracticePlayer({ arrangement }: PracticePlayerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempoBpm, setTempoBpm] = useState(clampTempoBpm(arrangement.tempoBpm));

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

      const nextScrollTop = scrollRef.current.scrollTop + scrollSpeed * deltaSeconds;
      const maxScrollTop = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;

      if (nextScrollTop >= maxScrollTop) {
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
  }, [isPlaying, scrollSpeed]);

  const handleTempoChange = (value: number) => {
    setTempoBpm(clampTempoBpm(value));
  };

  const resetScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setIsPlaying(false);
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{arrangement.title}</h1>
          <p className="text-sm text-slate-600">Stimmung: {arrangement.tuning}</p>
        </div>
        <div className="text-sm text-slate-600">Standardtempo: {arrangement.tempoBpm} BPM</div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
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
            onClick={resetScroll}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Zum Anfang
          </button>
        </div>
      </div>

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
