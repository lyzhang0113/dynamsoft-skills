# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The released version here must match `.claude-plugin/plugin.json`,
`.cursor-plugin/plugin.json`, `.cursor-plugin/marketplace.json` and `.codex-plugin/plugin.json`;
`node scripts/verify.mjs` enforces that.

## [Unreleased]

### Added

- `web-twain`: scanner picker, upload semantics, deployment (service installers, ports, CSP,
  Chromium local-network rules), React/Vue/Angular lifecycle, Barcode Reader, PDF and OCR Connector
  add-ons; ported from the retired `dynamsoft-sdk-skills` repository (#2).
- `verify.mjs` rejects mojibake and checks scripts, HTML and `.gitignore` for a BOM (#7).
- `CONTRIBUTING.md`; README documents single-skill install and other agents (#8).

### Fixed

- `web-twain`: resource copy nested `dist/` (script 404), scan flow that never resolved, OCR API and
  install steps, licence placeholder and `dwt-ddv` product id (#2).
- `document-viewer`: contradictory licence guidance and wrong trial link (#3).
- `dynamsoft-sdk`: mangled skill references, DDV version assumption (#4).
- `sdk-migration`: sample-index link that does not exist in a single-skill install (#5).
- Mojibake in `barcode-template-optimizer`, `document-viewer`, `dynamsoft-sdk` and `sdk-migration`;
  BOMs in `.gitignore` and two optimizer tools (#3–#7).
- README no longer describes the DWT key as a different kind of key (#8).

## [1.0.0] - 2026-11-10

### Added

- Eight platform-scoped skills: `dynamsoft-sdk` (product choice, license, routing),
  `capture-vision-web`, `capture-vision-mobile`, `capture-vision-desktop`,
  `web-twain`, `document-viewer`, `sdk-migration`, `barcode-template-optimizer`.
- Trial-license provisioning through the `dynamsoft-license-mcp` server: `get_trial_license`,
  `get_license_guide`, `describe_license`, `get_trial_page_url`. Every implementation skill
  documents the MCP flow, the edition rule and the manual fallback.
- Plugin manifests for Claude Code, Cursor and Codex.
- `scripts/verify.mjs`: manifest agreement, portable frontmatter and encoding checks.
- `tests/sdk-smoke/`: one QR decode per language binding (Python, Node.js, Java, .NET), run on
  Linux, Windows and macOS in CI.

### Notes

- Skills are split by platform rather than by capability, because the SDK is packaged per platform
  and the capability is selected by template.
- Frontmatter is limited to `name` and `description` so the same `SKILL.md` works unchanged in
  Claude Code, Cursor and Codex.
- Document and MRZ behaviour that needs a custom UX is documented as a Capture Vision task, not as
  a Document Scanner / MRZ Scanner configuration.
