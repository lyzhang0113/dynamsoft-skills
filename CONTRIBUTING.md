# Contributing

Guidance for people and coding agents changing this repository.

## Layout rules

- One skill per directory: `skills/<name>/SKILL.md`, with longer material in `skills/<name>/references/`.
- The frontmatter holds exactly `name` (equal to the directory name) and `description`. No
  `whenToUse` or other provider-specific keys — the same file must load unchanged in Claude Code,
  Cursor, Codex and DeepSeek Harness.
- A new skill also needs an entry in `skills.sh.json` and a row in the README skills table.
- Skills are installed one at a time (`npx skills add … --skill <name>`), so a skill must not depend
  on another skill's files. Refer to another skill by name ("the `dynamsoft-sdk` skill"), never by a
  relative path into it.

## Writing a skill

- **Description = routing.** Say what the skill covers, then "Use when …" with the phrasings users
  actually type (frameworks, error messages, workflows). The agent loads a skill only if this matches.
- **Licence keys** come from the `dynamsoft-license-mcp` tools and an environment variable
  (`DYNAMSOFT_LICENSE_KEY`). Generated code uses a placeholder or the variable, never a literal key;
  chat output shows only `licenseKeyMasked`.
- **Licence and trial wording** follows the official docs. Do not paraphrase commercial terms.
- **Versions** live in the README "Version baseline" table and in install commands. Avoid version
  claims in prose unless they document a compatibility boundary.
- **APIs** must exist in the shipped package: check the package's type definitions or an official
  sample before adding a call, and say which version you checked against.
- **Samples first.** Link the closest official sample next to generated code; keep snippets minimal
  and runnable.
- **Verification tier** — when a change moves a product or platform between executed, sample-checked
  and docs-only, update `docs/coverage.md`.

## Common mistakes

- Text pasted through a Windows editor that re-encodes UTF-8 as Windows-1252 (an em dash turns into
  three Latin characters) or adds a byte-order mark. `verify.mjs` rejects both.
- Stale or invented links (trial, store, docs, sample repositories).
- A skill that points at `references/<file>.md` that only exists in another skill.
- Shell snippets that copy a directory into an existing one (`cp -r pkg/dist public/x/` nests a
  `dist/` level); copy the contents with `dist/.` instead.

## Checks

```bash
node scripts/verify.mjs                    # manifests, frontmatter, encoding, DSH bundle
node dsh/scripts/prepare-skills.mjs        # when skills change: refresh the DSH snapshot
```

CI runs `verify.mjs` on Linux, Windows and macOS, plus the SDK smoke tests in `tests/sdk-smoke/`
when the `DYNAMSOFT_LICENSE_KEY` secret is set.

## Releases

- Add user-visible changes under `## [Unreleased]` in `CHANGELOG.md`.
- A release bumps the version in `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`,
  `.cursor-plugin/marketplace.json` and `.codex-plugin/plugin.json` together; `verify.mjs` fails if
  they disagree.

## Commits

Conventional style (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`), one concern per commit.
