#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { runBenchmarkSuite } from "./index.js";

interface CliOptions {
  manifestPath: string;
  strict: boolean;
  jsonOutputPath: string | null;
}

function parseArgs(argv: string[]): CliOptions {
  const runCwd = process.env.INIT_CWD ?? process.cwd();
  let manifestPath = path.resolve(runCwd, "benchmarks/manifest.json");
  let strict = false;
  let jsonOutputPath: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--strict") {
      strict = true;
      continue;
    }

    if (value === "--manifest") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--manifest requires a path value");
      }
      manifestPath = path.isAbsolute(next) ? next : path.resolve(runCwd, next);
      index += 1;
      continue;
    }

    if (value === "--json") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--json requires a path value");
      }
      jsonOutputPath = path.isAbsolute(next) ? next : path.resolve(runCwd, next);
      index += 1;
      continue;
    }

    if (value === "--help") {
      console.log(
        [
          "Usage: pnpm --filter @grifftab/benchmark-harness benchmark [--strict] [--manifest <path>] [--json <path>]",
          "",
          "--strict            Fail with exit code 1 when any licensed benchmark fails",
          "--manifest <path>   Manifest path (default: benchmarks/manifest.json)",
          "--json <path>       Write JSON summary to file"
        ].join("\n")
      );
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  return {
    manifestPath,
    strict,
    jsonOutputPath
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { summary, shouldFail } = await runBenchmarkSuite({
    manifestPath: options.manifestPath,
    strict: options.strict
  });

  console.log(
    JSON.stringify(
      {
        event: "benchmark.summary",
        manifestPath: summary.manifestPath,
        strict: summary.strict,
        totals: summary.totals
      },
      null,
      2
    )
  );

  for (const entry of summary.entries) {
    console.log(
      JSON.stringify(
        {
          event: "benchmark.entry",
          id: entry.id,
          status: entry.status,
          reason: entry.reason,
          parser: entry.parser,
          tokenMatchRatio: entry.tokenMatchRatio,
          measureCountMatch: entry.measureCountMatch,
          transposeMatch: entry.transposeMatch
        },
        null,
        2
      )
    );
  }

  if (options.jsonOutputPath) {
    const outputPath = options.jsonOutputPath;
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2), "utf8");
  }

  if (shouldFail) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        event: "benchmark.crash",
        error: error instanceof Error ? error.message : "unknown"
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
