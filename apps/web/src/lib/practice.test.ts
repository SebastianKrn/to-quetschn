import { describe, expect, it } from "vitest";
import {
  clampTempoBpm,
  formatTempoLabel,
  getLoopScrollBounds,
  getResetScrollTop,
  getScrollSpeedPxPerSecond,
  MAX_PRACTICE_TEMPO_BPM,
  MIN_PRACTICE_TEMPO_BPM,
  normalizeLoopRange,
  PRACTICE_SHORTCUT_TEMPO_STEP_BPM,
  stepTempoByShortcut
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

  it("normalizes loop ranges and swaps invalid boundaries", () => {
    expect(
      normalizeLoopRange({
        range: { startMeasure: 6, endMeasure: 2 },
        measureCount: 8
      })
    ).toEqual({
      startMeasure: 2,
      endMeasure: 6
    });
  });

  it("calculates loop scroll bounds from measure range", () => {
    const bounds = getLoopScrollBounds({
      range: { startMeasure: 2, endMeasure: 3 },
      measureCount: 4,
      maxScrollTop: 400
    });

    expect(bounds).toEqual({
      startPx: 100,
      endPx: 300
    });
  });

  it("steps tempo safely with keyboard shortcuts", () => {
    expect(
      stepTempoByShortcut({
        currentTempoBpm: 90,
        direction: "up"
      })
    ).toBe(90 + PRACTICE_SHORTCUT_TEMPO_STEP_BPM);

    expect(
      stepTempoByShortcut({
        currentTempoBpm: MIN_PRACTICE_TEMPO_BPM,
        direction: "down"
      })
    ).toBe(MIN_PRACTICE_TEMPO_BPM);
  });

  it("resets to loop start when loop mode is active", () => {
    expect(
      getResetScrollTop({
        loopEnabled: true,
        loopRange: { startMeasure: 3, endMeasure: 4 },
        measureCount: 4,
        maxScrollTop: 400
      })
    ).toBe(200);

    expect(
      getResetScrollTop({
        loopEnabled: false,
        loopRange: { startMeasure: 3, endMeasure: 4 },
        measureCount: 4,
        maxScrollTop: 400
      })
    ).toBe(0);
  });
});
