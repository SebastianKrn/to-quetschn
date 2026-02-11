import { describe, expect, it, vi } from "vitest";
import { PdfArrangementRenderer } from "@grifftab/renderer-pdf";
import {
  runExportPipeline,
  runExportPipelineWithFailureHandling
} from "../src/export-pipeline";

describe("export pipeline", () => {
  it("marks processing and completion with uploaded artifact", async () => {
    const calls: string[] = [];

    const domainClient = {
      async getArrangement() {
        return {
          id: "arr-1",
          title: "Export Song",
          tuning: "GCFB" as const,
          tempoBpm: 86,
          measures: [],
          metadata: {}
        };
      },
      async markExportProcessing() {
        calls.push("processing");
      },
      async markExportCompleted() {
        calls.push("completed");
      },
      async markExportFailed() {
        calls.push("failed");
      }
    };

    const storageClient = {
      async putObject() {
        calls.push("stored");
        return { key: "exports/arr-1/export-1.pdf" };
      }
    };

    const renderer = new PdfArrangementRenderer();

    const result = await runExportPipeline({
      payload: {
        exportId: "export-1",
        arrangementId: "arr-1",
        correlationId: "corr-1"
      },
      domainClient,
      storageClient,
      renderer
    });

    expect(result.status).toBe("completed");
    expect(result.artifactKey).toBe("exports/arr-1/export-1.pdf");
    expect(calls).toEqual(["processing", "stored", "completed"]);
  });

  it("marks export failed on renderer errors", async () => {
    const markExportFailed = vi.fn(async () => undefined);

    const domainClient = {
      async getArrangement() {
        return {
          id: "arr-2",
          title: "Broken Song",
          tuning: "GCFB" as const,
          tempoBpm: 80,
          measures: [],
          metadata: {}
        };
      },
      async markExportProcessing() {
        return undefined;
      },
      async markExportCompleted() {
        return undefined;
      },
      markExportFailed
    };

    const storageClient = {
      async putObject() {
        return { key: "unused" };
      }
    };

    const renderer = {
      render: vi.fn(async () => {
        throw new Error("boom");
      })
    } as unknown as PdfArrangementRenderer;

    await expect(
      runExportPipelineWithFailureHandling({
        payload: {
          exportId: "export-2",
          arrangementId: "arr-2",
          correlationId: "corr-2"
        },
        domainClient,
        storageClient,
        renderer
      })
    ).rejects.toBeInstanceOf(Error);

    expect(markExportFailed).toHaveBeenCalledWith({
      exportId: "export-2",
      errorCode: "EXPORT_RENDER_FAILED"
    });
  });
});
