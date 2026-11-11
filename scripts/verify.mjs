#!/usr/bin/env node
// Repository check: manifests agree, every skill has portable frontmatter, and the
// Runs in CI and on pre-push.
//
//   node scripts/verify.mjs

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const readText = (rel) => readFileSync(join(root, rel), "utf8");

const problems = [];
const notes = [];
const check = (ok, message) => { if (!ok) problems.push(message); };

// --- plugin manifests -------------------------------------------------------
const claudePlugin = readJson(".claude-plugin/plugin.json");
const claudeMarket = readJson(".claude-plugin/marketplace.json");
const cursorPlugin = readJson(".cursor-plugin/plugin.json");
const cursorMarket = readJson(".cursor-plugin/marketplace.json");
const codexPlugin = readJson(".codex-plugin/plugin.json");

const versions = {
  ".claude-plugin/plugin.json": claudePlugin.version,
  ".cursor-plugin/plugin.json": cursorPlugin.version,
  ".cursor-plugin/marketplace.json": cursorMarket.metadata?.version,
  ".codex-plugin/plugin.json": codexPlugin.version
};
const distinctVersions = new Set(Object.values(versions));
check(distinctVersions.size === 1, `plugin versions disagree: ${JSON.stringify(versions)}`);
notes.push(`plugin version: ${claudePlugin.version}`);

const pluginNames = new Set([claudePlugin.name, cursorPlugin.name, codexPlugin.name]);
check(pluginNames.size === 1, `plugin names disagree: ${[...pluginNames].join(", ")}`);

check(claudeMarket.plugins?.some((plugin) => plugin.name === claudePlugin.name), "claude marketplace does not list the plugin");
check(cursorMarket.plugins?.some((plugin) => plugin.name === cursorPlugin.name), "cursor marketplace does not list the plugin");

check(JSON.stringify(claudePlugin.mcpServers) === JSON.stringify("./.mcp.json"), "claude plugin must reference ./.mcp.json");
check(claudeMarket.owner?.name === "Dynamsoft", "claude marketplace owner must be Dynamsoft");
check(cursorMarket.owner?.name === "Dynamsoft", "cursor marketplace owner must be Dynamsoft");

// --- mcp config -------------------------------------------------------------
const mcp = readJson(".mcp.json");
const servers = Object.entries(mcp.mcpServers || {});
check(servers.length === 1, `expected exactly one MCP server, found ${servers.length}`);
const [, server] = servers[0] || [];
check(server?.command === "npx", "MCP server must run through npx");
check(JSON.stringify(server?.args || []) === JSON.stringify(["-y", "dynamsoft-license-mcp"]), "MCP server args must install dynamsoft-license-mcp");
check(JSON.stringify(cursorPlugin.mcpServers?.["dynamsoft-license"]) === JSON.stringify(server), "cursor plugin MCP entry disagrees with .mcp.json");

// --- codex listing limits ---------------------------------------------------
const iface = codexPlugin.interface || {};
check((iface.displayName || "").length <= 30, `interface.displayName exceeds 30 chars: ${iface.displayName}`);
check((iface.shortDescription || "").length <= 30, `interface.shortDescription exceeds 30 chars: ${iface.shortDescription}`);
check((iface.defaultPrompt || []).length <= 3, "interface.defaultPrompt accepts at most 3 prompts");
for (const prompt of iface.defaultPrompt || []) {
  check(prompt.length <= 128, `defaultPrompt exceeds 128 chars: ${prompt}`);
}
for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
  check(typeof iface[key] === "string" && iface[key].startsWith("https://"), `interface.${key} must be an https URL`);
}
for (const key of ["composerIcon", "logo"]) {
  const path = iface[key];
  check(typeof path === "string" && existsSync(join(root, path)), `interface.${key} points at a missing file: ${path}`);
}
check(Array.isArray(codexPlugin.skills) || typeof codexPlugin.skills === "string", "codex plugin should declare skills");

// --- skills -----------------------------------------------------------------
const skillsRoot = join(root, "skills");
const skillDirs = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
check(skillDirs.length > 0, "no skills found");

const skillMeta = [];
for (const dir of skillDirs) {
  const file = join(skillsRoot, dir, "SKILL.md");
  if (!existsSync(file)) { problems.push(`${dir}: missing SKILL.md`); continue; }
  const text = readFileSync(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) { problems.push(`${dir}: missing YAML frontmatter`); continue; }
  const front = match[1];
  const name = /^name:\s*(.+)$/m.exec(front)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  const description = /^description:\s*(.+)$/m.exec(front)?.[1]?.trim();
  check(name === dir, `${dir}: frontmatter name "${name}" must match the directory`);
  check(Boolean(description), `${dir}: missing description`);
  if (description) {
    check(description.length <= 1024, `${dir}: description is ${description.length} chars (limit 1024)`);
    check(description.length >= 40, `${dir}: description is too short to route on (${description.length} chars)`);
  }
  const body = text.slice(match[0].length).trim();
  check(body.length > 200, `${dir}: body is suspiciously short (${body.length} chars)`);
  check(/^## /m.test(body), `${dir}: body should have at least one "## " section`);
  skillMeta.push({ dir, name, description });
}

// --- changelog --------------------------------------------------------------
const changelog = join(root, "CHANGELOG.md");
if (existsSync(changelog)) {
  const text = readFileSync(changelog, "utf8");
  check(
    text.includes(`## [${claudePlugin.version}]`),
    `CHANGELOG.md has no "## [${claudePlugin.version}]" section for the current plugin version`
  );
  check(/^## \[Unreleased\]/m.test(text), "CHANGELOG.md should keep an Unreleased section");
} else {
  problems.push("CHANGELOG.md is missing (Cursor's third-party layout expects one)");
}

// --- skills.sh grouping -----------------------------------------------------
const groupsFile = join(root, "skills.sh.json");
if (existsSync(groupsFile)) {
  const groups = JSON.parse(readFileSync(groupsFile, "utf8"));
  const names = new Set(skillDirs);
  const listed = new Set();
  for (const group of groups.groupings || []) {
    for (const skill of group.skills || []) {
      check(names.has(skill), `skills.sh.json references unknown skill "${skill}"`);
      listed.add(skill);
    }
  }
  const missing = [...names].filter((name) => !listed.has(name));
  check(missing.length === 0, `skills.sh.json does not group: ${missing.join(", ")}`);
}

// --- encoding ---------------------------------------------------------------
// A UTF-8 BOM breaks YAML frontmatter and JSON.parse, and it has slipped in twice.
const bomFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(md|json|ya?ml)$/.test(entry.name)) continue;
    const head = readFileSync(full).subarray(0, 3);
    if (head.length === 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
      bomFiles.push(full.slice(root.length + 1));
    }
  }
};
walk(root);
check(bomFiles.length === 0, `files start with a UTF-8 BOM: ${bomFiles.join(", ")}`);

// --- summary ----------------------------------------------------------------
console.log(`skills: ${skillDirs.length}`);
for (const meta of skillMeta) console.log(`  ${meta.name.padEnd(28)} ${String(meta.description.length).padStart(4)} chars`);
for (const note of notes) console.log(note);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log("\nOK");
