# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The released version here must match `.claude-plugin/plugin.json`,
`.cursor-plugin/plugin.json`, `.cursor-plugin/marketplace.json` and `.codex-plugin/plugin.json`;
`node scripts/verify.mjs` enforces that.

## [Unreleased]

## [1.0.0] - 2026-11-10

### Added

- Eight platform-scoped skills: `dynamsoft-sdk` (product choice, license, routing),
  `capture-vision-web`, `capture-vision-mobile`, `capture-vision-desktop`,
  `web-twain`, `document-viewer`, `sdk-migration`, `barcode-template-optimizer`.
- Trial-license provisioning through the `dynamsoft-license-mcp` server: `get_trial_license`,
  `get_license_guide`, `describe_license`, `get_trial_page_url`. Every implementation skill
  documents the MCP flow, the edition rule and the manual fallback.
- Plugin manifests for Claude Code, Cursor and Codex, plus a DeepSeek Harness bundle
  (`dynamsoft-dsh-plugin`, under `dsh/`) that adds the MCP client row and links the skills.
- `scripts/verify.mjs`: manifest agreement, portable frontmatter, DSH patch and encoding checks.
- `tests/sdk-smoke/`: one QR decode per language binding (Python, Node.js, Java, .NET), run on
  Linux, Windows and macOS in CI.

### Notes

- Skills are split by platform rather than by capability, because the SDK is packaged per platform
  and the capability is selected by template.
- Frontmatter is limited to `name` and `description` so the same `SKILL.md` works unchanged in
  Claude Code, Cursor, Codex and DeepSeek Harness.
- Document and MRZ behaviour that needs a custom UX is documented as a Capture Vision task, not as
  a Document Scanner / MRZ Scanner configuration.
