import fs from "node:fs";
import path from "node:path";

const memoryPath = path.join(process.cwd(), "memory.md");
const requiredSections = [
  "# GriffTab Memory",
  "## Snapshot",
  "## Decisions (Locked)",
  "## Current State",
  "## Open Risks",
  "## Next Actions",
  "## Session Log Template"
];

if (!fs.existsSync(memoryPath)) {
  throw new Error("memory.md missing");
}

const content = fs.readFileSync(memoryPath, "utf8");
for (const section of requiredSections) {
  if (!content.includes(section)) {
    throw new Error(`memory.md missing section: ${section}`);
  }
}

console.log("memory.md structure is valid.");
