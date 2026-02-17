export const MIN_PRACTICE_TEMPO_BPM = 40;
export const MAX_PRACTICE_TEMPO_BPM = 180;
export const PRACTICE_SHORTCUT_TEMPO_STEP_BPM = 5;
const BASE_SCROLL_PX_PER_SECOND = 42;

export interface PracticeLoopRange {
  startMeasure: number;
  endMeasure: number;
}

export function clampTempoBpm(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_PRACTICE_TEMPO_BPM;
  }

  return Math.max(MIN_PRACTICE_TEMPO_BPM, Math.min(MAX_PRACTICE_TEMPO_BPM, Math.round(value)));
}

export function getScrollSpeedPxPerSecond(input: {
  arrangementTempoBpm: number;
  selectedTempoBpm: number;
}): number {
  const arrangementTempo = clampTempoBpm(input.arrangementTempoBpm);
  const selectedTempo = clampTempoBpm(input.selectedTempoBpm);
  return BASE_SCROLL_PX_PER_SECOND * (selectedTempo / arrangementTempo);
}

export function formatTempoLabel(tempoBpm: number): string {
  return `${clampTempoBpm(tempoBpm)} BPM`;
}

function clampMeasureIndex(input: { value: number; measureCount: number }): number {
  const upperBound = Math.max(1, Math.round(input.measureCount));
  if (!Number.isFinite(input.value)) {
    return 1;
  }

  return Math.max(1, Math.min(upperBound, Math.round(input.value)));
}

export function normalizeLoopRange(input: {
  range: PracticeLoopRange;
  measureCount: number;
}): PracticeLoopRange {
  const startMeasure = clampMeasureIndex({
    value: input.range.startMeasure,
    measureCount: input.measureCount
  });
  const endMeasure = clampMeasureIndex({
    value: input.range.endMeasure,
    measureCount: input.measureCount
  });

  return startMeasure <= endMeasure
    ? { startMeasure, endMeasure }
    : { startMeasure: endMeasure, endMeasure: startMeasure };
}

export function getLoopScrollBounds(input: {
  range: PracticeLoopRange;
  measureCount: number;
  maxScrollTop: number;
}): {
  startPx: number;
  endPx: number;
} {
  const normalized = normalizeLoopRange({
    range: input.range,
    measureCount: input.measureCount
  });
  const maxScrollTop = Math.max(0, input.maxScrollTop);
  const measureCount = Math.max(1, Math.round(input.measureCount));
  const segmentHeight = maxScrollTop / measureCount;
  const startPx = Math.min(maxScrollTop, Math.max(0, (normalized.startMeasure - 1) * segmentHeight));
  const endPxRaw = Math.min(maxScrollTop, Math.max(startPx, normalized.endMeasure * segmentHeight));
  const endPx = endPxRaw <= startPx && maxScrollTop > startPx ? Math.min(maxScrollTop, startPx + 1) : endPxRaw;

  return {
    startPx,
    endPx
  };
}

export function stepTempoByShortcut(input: {
  currentTempoBpm: number;
  direction: "up" | "down";
}): number {
  const delta = input.direction === "up" ? PRACTICE_SHORTCUT_TEMPO_STEP_BPM : -PRACTICE_SHORTCUT_TEMPO_STEP_BPM;
  return clampTempoBpm(input.currentTempoBpm + delta);
}

export function getResetScrollTop(input: {
  loopEnabled: boolean;
  loopRange: PracticeLoopRange;
  measureCount: number;
  maxScrollTop: number;
}): number {
  if (!input.loopEnabled) {
    return 0;
  }

  return getLoopScrollBounds({
    range: input.loopRange,
    measureCount: input.measureCount,
    maxScrollTop: input.maxScrollTop
  }).startPx;
}
