import { describe, expect, it } from "vitest";
import {
  clampTempoBpm,
  formatTempoLabel,
  getScrollSpeedPxPerSecond,
  MAX_PRACTICE_TEMPO_BPM,
  MIN_PRACTICE_TEMPO_BPM
} from "./practice";

describe("practice helpers", () => {
  it("clamps tempo inside configured bounds", () => {
    expect(clampTempoBpm(20)).toBe(MIN_PRACTICE_TEMPO_BPM);
    expect(clampTempoBpm(95)).toBe(95);
    expect(clampTempoBpm(220)).toBe(MAX_PRACTICE_TEMPO_BPM);
  });

  it("calculates scroll speed relative to arrangement tempo", () => {
    const speed = getScrollSpeedPxPerSecond({
      arrangementTempoBpm: 80,
      selectedTempoBpm: 120
    });

    expect(speed).toBeCloseTo(63, 1);
  });

  it("formats tempo labels in german practice UI", () => {
    expect(formatTempoLabel(100)).toBe("100 BPM");
  });
});
