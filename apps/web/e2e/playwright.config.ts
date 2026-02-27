import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "../../..");

function parseTimeoutMs(value: string | undefined, fallbackMs: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }

  return Math.floor(parsed);
}

export default defineConfig({
  testDir: currentDir,
  testMatch: "mvp-smoke.pw.ts",
  timeout: parseTimeoutMs(process.env.MVP_SCENARIO_TEST_TIMEOUT_MS, 240_000),
  expect: {
    timeout: 15_000
  },
  retries: 0,
  reporter: [["list"]],
  outputDir: path.join(workspaceRoot, ".artifacts/playwright"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.MVP_BASE_URL ?? "http://127.0.0.1:3000",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  }
});
