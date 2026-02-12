import { describe, expect, it } from "vitest";
import { normalizeAudiverisOutput, normalizeAudiverisOutputDetailed } from "../src/normalize";

describe("normalizeAudiverisOutput", () => {
  it("parses canonical JSON output", () => {
    const score = normalizeAudiverisOutput({
      stdout: JSON.stringify({
        title: "Canon",
        tempoBpm: 96,
        timeSignature: "3/4",
        notes: [{ pitch: "C4", duration: "quarter", measure: 1, beat: 0 }]
      }),
      sourceFilePath: "sample.pdf"
    });

    expect(score.title).toBe("Canon");
    expect(score.tempoBpm).toBe(96);
    expect(score.notes).toHaveLength(1);
  });

  it("parses delimited fallback output", () => {
    const score = normalizeAudiverisOutput({
      stdout: "1,0,C4,quarter\n1,1,D4,quarter",
      sourceFilePath: "sample.pdf"
    });

    expect(score.notes).toEqual([
      { measure: 1, beat: 0, pitch: "C4", duration: "quarter" },
      { measure: 1, beat: 1, pitch: "D4", duration: "quarter" }
    ]);
  });

  it("parses MusicXML output", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Polka Test</work-title></work>
  <part-list><score-part id="P1"><part-name>Accordion</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><direction-type><words>Tempo</words></direction-type><sound tempo="112"/></direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>D</step><alter>1</alter><octave>4</octave></pitch>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

    const detailed = normalizeAudiverisOutputDetailed({
      stdout: xml,
      sourceFilePath: "sample.pdf",
      inputSource: "sample.musicxml"
    });

    expect(detailed.parser).toBe("musicxml");
    expect(detailed.score.title).toBe("Polka Test");
    expect(detailed.score.tempoBpm).toBe(112);
    expect(detailed.score.notes[1]?.pitch).toBe("D#4");
  });

  it("returns parser diagnostics on parse failure", () => {
    let captured: unknown;
    try {
      normalizeAudiverisOutput({
        stdout: "not-parseable-content",
        sourceFilePath: "sample.pdf"
      });
    } catch (error) {
      captured = error;
    }

    expect(captured).toMatchObject({
      code: "OMR_PARSE_FAILED",
      details: expect.objectContaining({
        parsersTried: "json,musicxml,delimited"
      })
    });
  });
});
