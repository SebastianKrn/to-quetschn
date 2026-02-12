export const MIN_PRACTICE_TEMPO_BPM = 40;
export const MAX_PRACTICE_TEMPO_BPM = 180;
const BASE_SCROLL_PX_PER_SECOND = 42;

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
