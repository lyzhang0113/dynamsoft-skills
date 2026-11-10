#!/usr/bin/env node
// Repository check: manifests agree, every skill has portable frontmatter, and the
// DSH bundle patch is consistent with the license MCP. Runs in CI and on pre-push.
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
  check(!/^whenToUse:/m.test(front), `${dir}: use description instead of the DSH-only whenToUse key`);
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

// --- dsh bundle -------------------------------------------------------------
const dshPackage = readJson("dsh/package.json");
check(dshPackage.dsh?.bundle?.patch === "./cordis.patch.yml", "dsh package must declare dsh.bundle.patch");
check(existsSync(join(root, "dsh", "cordis.patch.yml")), "dsh patch file is missing");
const patch = readText("dsh/cordis.patch.yml");
check(/name:\s*'@deepseek-ai\/dsh-mcp-client'/.test(patch), "dsh patch must add the mcp-client row");
check(/serverName:\s*dynamsoft/.test(patch), "dsh patch must use serverName dynamsoft");
check(/toolCallTimeoutMs:\s*(\d+)/.test(patch), "dsh patch must set toolCallTimeoutMs");
const timeout = Number(/toolCallTimeoutMs:\s*(\d+)/.exec(patch)?.[1] || 0);
check(timeout > 60000, `dsh toolCallTimeoutMs (${timeout}) must exceed the 60s default`);
notes.push(`dsh bundle: ${dshPackage.name}@${dshPackage.version}`);

// --- encoding ---------------------------------------------------------------
// A UTF-8 BOM breaks YAML frontmatter and JSON.parse, and it has slipped in twice.
// Mojibake (UTF-8 read as Windows-1252 and saved again, so an em dash becomes the three
// characters U+00E2 U+20AC U+201D) has slipped in through Windows editors; agents copy it
// verbatim into generated code.
const bomFiles = [];
const mojibakeFiles = [];
const mojibake = /[ÂÃâ][\u0080-\u00bf\u0152-\u0192\u02c6-\u02dc\u2013-\u2122]/;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dsh") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(md|json|ya?ml|mjs|js|py|html|txt)$|^\.gitignore$/.test(entry.name)) continue;
    const bytes = readFileSync(full);
    const rel = full.slice(root.length + 1);
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bomFiles.push(rel);
    if (mojibake.test(bytes.toString("utf8"))) mojibakeFiles.push(rel);
  }
};
walk(root);
check(bomFiles.length === 0, `files start with a UTF-8 BOM: ${bomFiles.join(", ")}`);
check(mojibakeFiles.length === 0, `files contain mojibake (UTF-8 decoded as Windows-1252): ${mojibakeFiles.join(", ")}`);

// --- dsh market index -------------------------------------------------------
// Structural checks mirroring format 1; the authoritative validator is
// @deepseek-ai/dsh-plugin-market-index (parseMarketIndex), run when the index changes.
const indexPath = join(root, "dsh", "index.json");
if (existsSync(indexPath)) {
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  check(index.format === 1, "dsh/index.json must declare format 1");
  check(typeof index.title === "string" || index.title?.en, "dsh/index.json needs a title (or an object containing en)");
  check(index.metadata && typeof index.metadata === "object", "dsh/index.json needs a metadata object");
  const categories = new Set(Object.keys(index.metadata?.categories ?? {}));
  check(Array.isArray(index.plugins) && index.plugins.length > 0, "dsh/index.json needs at least one plugin");

  for (const plugin of index.plugins ?? []) {
    const label = plugin.name ?? "<unnamed>";
    check(typeof plugin.name === "string" && plugin.name.includes("-"), `${label}: name must be an npm package name`);
    check(typeof plugin.author === "string", `${label}: author is required`);
    check(typeof plugin.homepage === "string" && plugin.homepage.startsWith("https://"), `${label}: homepage must be https`);
    check(typeof plugin.repository?.url === "string", `${label}: repository.url is required`);
    if (plugin.metadata?.category) {
      check(categories.has(plugin.metadata.category), `${label}: category "${plugin.metadata.category}" is not declared in metadata.categories`);
    }
    check(Array.isArray(plugin.versions) && plugin.versions.length > 0, `${label}: needs at least one version`);
    const semvers = (plugin.versions ?? []).map((version) => version.version);
    for (const version of plugin.versions ?? []) {
      check(/^\d+\.\d+\.\d+/.test(version.version), `${label}: "${version.version}" is not a semver`);
      check(Number.isInteger(version.publishTimestamp), `${label}@${version.version}: publishTimestamp must be Unix seconds`);
      const source = version.source ?? {};
      if (source.type === "git") {
        check(source.url?.startsWith("https://"), `${label}@${version.version}: git source needs an https url`);
        check(/^[0-9a-f]{40}$/.test(source.commit ?? ""), `${label}@${version.version}: git source needs a 40-hex commit`);
      } else {
        check(source.type === "npm", `${label}@${version.version}: source.type must be npm or git`);
      }
    }
    const descending = semvers.slice().sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    check(JSON.stringify(semvers) === JSON.stringify(descending), `${label}: versions must be ordered newest first`);
  }
  notes.push(`dsh index: ${index.plugins.length} plugin(s)`);
}

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
