import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const agentsRoot = path.join(root, ".agents", "skills");
const claudeRoot = path.join(root, ".claude", "skills");

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function requireSkillMd(skillRoot, skillName) {
  const skillPath = path.join(skillRoot, skillName, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Missing SKILL.md: ${skillPath}`);
  }

  const content = fs.readFileSync(skillPath, "utf8");
  if (!content.startsWith("---\n")) {
    throw new Error(`Frontmatter missing in ${skillPath}`);
  }
  if (!content.includes("\nname:")) {
    throw new Error(`Frontmatter name missing in ${skillPath}`);
  }
  if (!content.includes("\ndescription:")) {
    throw new Error(`Frontmatter description missing in ${skillPath}`);
  }
}

function compareSkillFiles(skillName) {
  const a = path.join(agentsRoot, skillName, "SKILL.md");
  const b = path.join(claudeRoot, skillName, "SKILL.md");
  const aContent = fs.readFileSync(a, "utf8");
  const bContent = fs.readFileSync(b, "utf8");
  if (aContent !== bContent) {
    throw new Error(`Skill drift detected: ${skillName}`);
  }
}

const agentSkills = listDirs(agentsRoot);
const claudeSkills = listDirs(claudeRoot);

if (agentSkills.length === 0) {
  throw new Error("No skills found under .agents/skills");
}

if (JSON.stringify(agentSkills) !== JSON.stringify(claudeSkills)) {
  throw new Error("Skill directories differ between .agents and .claude");
}

for (const skillName of agentSkills) {
  requireSkillMd(agentsRoot, skillName);
  requireSkillMd(claudeRoot, skillName);
  compareSkillFiles(skillName);
}

console.log(`Validated ${agentSkills.length} mirrored skills successfully.`);
