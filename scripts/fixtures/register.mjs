#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const rootDir = process.cwd();
const benchmarkManifestPath = path.join(rootDir, "benchmarks/manifest.json");
const replayManifestPath = path.join(rootDir, "benchmarks/replay-manifest.json");

function parseArgs(argv) {
  const options = {
    pdf: "",
    normalized: "",
    expected: "",
    id: "",
    license: "licensed",
    tuning: "GCFB",
    title: "",
    notes: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--pdf":
        options.pdf = next ?? "";
        index += 1;
        break;
      case "--normalized":
        options.normalized = next ?? "";
        index += 1;
        break;
      case "--expected":
        options.expected = next ?? "";
        index += 1;
        break;
      case "--id":
        options.id = next ?? "";
        index += 1;
        break;
      case "--license":
        options.license = next ?? "";
        index += 1;
        break;
      case "--tuning":
        options.tuning = next ?? "";
        index += 1;
        break;
      case "--title":
        options.title = next ?? "";
        index += 1;
        break;
      case "--notes":
        options.notes = next ?? "";
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.pdf || !options.normalized || !options.id) {
    throw new Error("Usage: --pdf <path> --normalized <path> --id <id> [--license licensed|pending|blocked]");
  }

  if (!["licensed", "pending", "blocked"].includes(options.license)) {
    throw new Error("--license must be one of: licensed, pending, blocked");
  }

  if (!["GCFB", "ADGC", "BEADG", "CFBB"].includes(options.tuning)) {
    throw new Error("--tuning must be one of: GCFB, ADGC, BEADG, CFBB");
  }

  return options;
}

function toManifestPath(inputPath) {
  const absolute = path.isAbsolute(inputPath) ? inputPath : path.resolve(rootDir, inputPath);
  return path.relative(rootDir, absolute).replaceAll(path.sep, "/");
}

function toReplayPath(normalizedPath) {
  const absolute = path.isAbsolute(normalizedPath) ? normalizedPath : path.resolve(rootDir, normalizedPath);
  const relativeToBenchmarks = path
    .relative(path.join(rootDir, "benchmarks"), absolute)
    .replaceAll(path.sep, "/");
  return `./${relativeToBenchmarks}`;
}

async function ensureFileExists(targetPath) {
  await fs.access(targetPath);
}

async function checksumSha256(filePath) {
  const data = await fs.readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

const options = parseArgs(process.argv.slice(2));

const pdfPath = path.isAbsolute(options.pdf) ? options.pdf : path.resolve(rootDir, options.pdf);
const normalizedPath = path.isAbsolute(options.normalized)
  ? options.normalized
  : path.resolve(rootDir, options.normalized);
const expectedPath = options.expected
  ? path.isAbsolute(options.expected)
    ? options.expected
    : path.resolve(rootDir, options.expected)
  : path.join(rootDir, "benchmarks/expected", `${options.id}.json`);

await ensureFileExists(pdfPath);
await ensureFileExists(normalizedPath);
await ensureFileExists(expectedPath);

const checksum = await checksumSha256(pdfPath);

const benchmarkManifest = JSON.parse(await fs.readFile(benchmarkManifestPath, "utf8"));
const replayManifest = JSON.parse(await fs.readFile(replayManifestPath, "utf8"));

const sourcePdf = toManifestPath(pdfPath);
const normalizedInput = toManifestPath(normalizedPath);
const expectedJson = toManifestPath(expectedPath);
const replayNormalizedInput = toReplayPath(normalizedPath);

const benchmarkEntry = {
  id: options.id,
  title: options.title || `Registered fixture ${options.id}`,
  sourcePdf,
  normalizedInput,
  expectedJson,
  tuning: options.tuning,
  licenseStatus: options.license,
  notes: options.notes || "Registered via fixtures:register",
  thresholds: {
    tokenMatchRatioMin: 1,
    requireMeasureCount: true,
    requireTransposeSuggestions: true
  }
};

const existingBenchmarkIndex = benchmarkManifest.entries.findIndex((entry) => entry.id === options.id);
if (existingBenchmarkIndex >= 0) {
  benchmarkManifest.entries[existingBenchmarkIndex] = benchmarkEntry;
} else {
  benchmarkManifest.entries.push(benchmarkEntry);
}

const replayEntry = {
  checksumSha256: checksum,
  normalizedInput: replayNormalizedInput,
  label: options.id
};

const existingReplayIndex = replayManifest.entries.findIndex(
  (entry) => entry.checksumSha256.toLowerCase() === checksum.toLowerCase()
);
if (existingReplayIndex >= 0) {
  replayManifest.entries[existingReplayIndex] = replayEntry;
} else {
  replayManifest.entries.push(replayEntry);
}

await fs.writeFile(benchmarkManifestPath, JSON.stringify(benchmarkManifest, null, 2) + "\n", "utf8");
await fs.writeFile(replayManifestPath, JSON.stringify(replayManifest, null, 2) + "\n", "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      id: options.id,
      checksumSha256: checksum,
      benchmarkManifestPath,
      replayManifestPath
    },
    null,
    2
  )
);
