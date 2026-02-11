import { describe, expect, it } from "vitest";
import {
  ApiContracts,
  ConversionJobSchema,
  QueueTopics,
  TUNINGS,
  type ConversionJob
} from "../src/index";

describe("domain contracts", () => {
  it("matches api contract snapshot", () => {
    expect(ApiContracts).toMatchSnapshot();
  });

  it("supports required queue topics", () => {
    expect(Object.values(QueueTopics)).toEqual([
      "conversion.requested",
      "conversion.completed",
      "conversion.failed",
      "export.requested",
      "export.completed",
      "export.failed"
    ]);
  });

  it("validates conversion job payload", () => {
    const job: ConversionJob = {
      id: "job-1",
      status: "queued",
      inputFileId: "file-1",
      tuning: TUNINGS[0],
      progress: 0,
      errorCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const parsed = ConversionJobSchema.parse(job);
    expect(parsed.id).toBe("job-1");
  });
});
