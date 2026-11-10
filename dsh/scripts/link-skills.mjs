#!/usr/bin/env node
// Link this bundle's skills into the DSH user skill root ($DSH_HOME/skills, rank 400),
// or copy them there when links are unavailable. Junction/link creation needs no
// admin rights on Windows for directories.
//
//   node scripts/link-skills.mjs            link into $DSH_HOME/skills
//   node scripts/link-skills.mjs --copy     copy instead of link
//   node scripts/link-skills.mjs --remove   remove links this bundle created
//   node scripts/link-skills.mjs --dest X   use a different skills root (for tests)
//   node scripts/link-skills.mjs --dry-run  print the plan, touch nothing

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const skillsDir = join(packageRoot, "skills");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const copy = args.includes("--copy");
const remove = args.includes("--remove");
const quiet = args.includes("--quiet");
const destFlag = args.indexOf("--dest");
const destRoot = destFlag >= 0 && args[destFlag + 1]
  ? resolve(args[destFlag + 1])
  : join(process.env.DSH_HOME || join(homedir(), ".dsh"), "skills");

const log = (...parts) => { if (!quiet) console.log(...parts); };

function readSkillName(dir) {
  const file = join(dir, "SKILL.md");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const name = match ? /^name:\s*(.+)$/m.exec(match[1])?.[1]?.trim().replace(/^['"]|['"]$/g, "") : null;
  return name || null;
}

if (!existsSync(skillsDir)) {
  console.error(`No skills directory at ${skillsDir}. Run "node scripts/prepare-skills.mjs" first.`);
  process.exit(1);
}

const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(skillsDir, entry.name))
  .filter((dir) => readSkillName(dir) !== null);

if (skills.length === 0) {
  console.error(`No skills found under ${skillsDir}.`);
  process.exit(1);
}

log(`skills root: ${destRoot}`);
log(`source:      ${skillsDir}`);
log(`mode:        ${remove ? "remove" : copy ? "copy" : "link"}${dryRun ? " (dry run)" : ""}`);

let changed = 0;
for (const source of skills) {
  const name = readSkillName(source);
  const target = join(destRoot, name);

  if (remove) {
    if (existsSync(target)) {
      log(`  remove  ${name}`);
      if (!dryRun) rmSync(target, { recursive: true, force: true });
      changed++;
    }
    continue;
  }

  if (existsSync(target)) {
    const stats = lstatSync(target);
    const pointsHere = stats.isSymbolicLink() && resolve(target, "..") && safeRealpath(target) === source;
    if (pointsHere) { log(`  ok      ${name} (already linked)`); continue; }
    log(`  skip    ${name} (already exists — remove it yourself if it should be replaced)`);
    continue;
  }

  log(`  ${copy ? "copy  " : "link  "}  ${name} -> ${target}`);
  if (dryRun) { changed++; continue; }

  mkdirSync(destRoot, { recursive: true });
  if (copy) {
    cpSync(source, target, { recursive: true });
  } else {
    // "junction" avoids the Windows developer-mode requirement for directory links.
    symlinkSync(source, target, process.platform === "win32" ? "junction" : "dir");
  }
  changed++;
}

log(changed === 0 ? "nothing to do" : `${changed} skill(s) ${remove ? "removed" : dryRun ? "would change" : "installed"}`);

function safeRealpath(path) {
  try { return resolve(path).replace(/\\/g, "/"); } catch { return null; }
}
