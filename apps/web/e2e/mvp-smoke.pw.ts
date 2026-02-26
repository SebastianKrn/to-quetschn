import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

interface ScenarioStep {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  error?: string;
}

interface ScenarioSummary {
  timestamp: string;
  fixture: string;
  devUserId: string;
  conversionId: string | null;
  arrangementId: string | null;
  exportId: string | null;
  steps: ScenarioStep[];
  result: "passed" | "failed";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

test("MVP smoke: convert -> practice edit -> export", async ({ page }) => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(currentDir, "../../..");
  const fixturePath = process.env.MVP_SCENARIO_FIXTURE ?? path.join(workspaceRoot, "benchmarks/pdfs/sample-licensed-001.pdf");
  const summaryPath =
    process.env.MVP_SCENARIO_SUMMARY_PATH ?? path.join(workspaceRoot, ".artifacts/mvp-scenario-summary.json");
  const devUserId = process.env.MVP_DEV_USER_ID ?? "dev-user";

  const summary: ScenarioSummary = {
    timestamp: new Date().toISOString(),
    fixture: fixturePath,
    devUserId,
    conversionId: null,
    arrangementId: null,
    exportId: null,
    steps: [],
    result: "failed"
  };

  const runStep = async (name: string, callback: () => Promise<void>) => {
    const startedAt = Date.now();

    try {
      await callback();
      summary.steps.push({
        name,
        status: "passed",
        durationMs: Date.now() - startedAt
      });
    } catch (error) {
      summary.steps.push({
        name,
        status: "failed",
        durationMs: Date.now() - startedAt,
        error: errorMessage(error)
      });
      throw error;
    }
  };

  try {
    await runStep("open-dashboard", async () => {
      await page.goto("/");
      await expect(page.getByTestId("conversion-file-input")).toBeVisible();
    });

    await runStep("start-conversion", async () => {
      await page.getByTestId("dev-user-id-input").fill(devUserId);
      await page.getByTestId("conversion-file-input").setInputFiles(fixturePath);
      await page.getByTestId("conversion-start-button").click();
      await expect(page.getByTestId("conversion-section")).toBeVisible();
      summary.conversionId = (await page.getByTestId("conversion-job-id-value").innerText()).trim();
      summary.arrangementId = summary.conversionId;
    });

    await runStep("wait-conversion-completed", async () => {
      const statusLocator = page.getByTestId("conversion-status-value");
      const deadlineMs = Date.now() + 180_000;

      while (Date.now() < deadlineMs) {
        const status = (await statusLocator.innerText()).trim();

        if (status === "needs_transpose_confirmation") {
          await page.getByTestId("transpose-confirm-button").first().click();
        } else if (status === "completed") {
          return;
        } else if (status === "failed") {
          const errorCode = (await page.getByTestId("conversion-error-value").innerText()).trim();
          throw new Error(`Conversion failed with error code: ${errorCode}`);
        }

        await page.waitForTimeout(1_000);
      }

      throw new Error("Timed out waiting for conversion completion");
    });

    await runStep("open-practice", async () => {
      await page.getByTestId("practice-open-link").click();
      await expect(page).toHaveURL(/\/practice\//);
      await expect(page.getByTestId("practice-svg-container")).toBeVisible();
    });

    await runStep("edit-first-token", async () => {
      const token = page.locator("[data-token-id]").first();
      await expect(token).toBeVisible();
      await token.click();

      const rowInput = page.getByTestId("token-row-input");
      const buttonInput = page.getByTestId("token-button-input");
      const directionSelect = page.getByTestId("token-direction-select");

      const currentRow = Number(await rowInput.inputValue());
      const currentButton = Number(await buttonInput.inputValue());
      const currentDirection = await directionSelect.inputValue();

      const nextRow = currentRow > 1 ? currentRow - 1 : currentRow + 1;
      const nextButton = currentButton > 1 ? currentButton - 1 : currentButton + 1;
      const nextDirection = currentDirection === "push" ? "pull" : "push";

      await rowInput.fill(String(nextRow));
      await buttonInput.fill(String(nextButton));
      await directionSelect.selectOption(nextDirection);
      await page.getByTestId("token-save-button").click();
      await expect(page.getByTestId("token-patch-message")).toContainText("Token wurde gespeichert");
    });

    await runStep("trigger-and-poll-export", async () => {
      if (!summary.arrangementId) {
        throw new Error("Arrangement ID missing before export step");
      }

      const triggerResponse = await page.request.post(`/api/arrangements/${summary.arrangementId}/export`, {
        headers: {
          "x-dev-user-id": devUserId
        }
      });

      expect(triggerResponse.ok()).toBeTruthy();
      const triggerBody = (await triggerResponse.json()) as {
        export?: {
          id: string;
          status: string;
        };
      };

      if (!triggerBody.export?.id) {
        throw new Error("Export trigger response missing export id");
      }

      summary.exportId = triggerBody.export.id;

      const deadlineMs = Date.now() + 120_000;
      while (Date.now() < deadlineMs) {
        const statusResponse = await page.request.get(`/api/arrangements/${summary.arrangementId}/export`, {
          headers: {
            "x-dev-user-id": devUserId
          }
        });

        expect(statusResponse.ok()).toBeTruthy();
        const statusBody = (await statusResponse.json()) as {
          export?: {
            status: string;
          };
          download?: {
            url: string;
          };
        };

        const exportStatus = statusBody.export?.status;
        if (exportStatus === "completed") {
          if (!statusBody.download?.url) {
            throw new Error("Export completed but download url missing");
          }
          return;
        }

        if (exportStatus === "failed") {
          throw new Error("Export failed while polling");
        }

        await page.waitForTimeout(1_000);
      }

      throw new Error("Timed out waiting for export completion");
    });

    summary.result = "passed";
  } finally {
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  }
});
