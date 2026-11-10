#!/usr/bin/env node
// Copy the repository's skills/ into the bundle before packing, so the published
// package is self-contained. The repo keeps one copy; the bundle carries a snapshot.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const repoSkills = resolve(packageRoot, "..", "skills");
const bundleSkills = join(packageRoot, "skills");

if (!existsSync(repoSkills)) {
  console.error(`No repository skills directory at ${repoSkills}.`);
  process.exit(1);
}

rmSync(bundleSkills, { recursive: true, force: true });
mkdirSync(bundleSkills, { recursive: true });

const entries = readdirSync(repoSkills, { withFileTypes: true }).filter((entry) => entry.isDirectory());
for (const entry of entries) {
  cpSync(join(repoSkills, entry.name), join(bundleSkills, entry.name), { recursive: true });
}

console.log(`copied ${entries.length} skill(s) into ${bundleSkills}`);
