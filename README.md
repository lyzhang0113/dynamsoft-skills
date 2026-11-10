# Dynamsoft agent skills

AI agent skills for integrating the [Dynamsoft](https://www.dynamsoft.com/) SDKs, plus a license
server that issues trial keys so generated code actually runs.

Each skill is scoped to one job — barcode scanning on web, mobile or server, MRZ, document capture,
Web TWAIN scanning, document viewing, migration, template tuning — and carries the code patterns,
licensing, pitfalls and sample links for that job. The agent loads only the one your prompt needs.

## Install

```bash
npx skills add Dynamsoft/dynamsoft-skills
```

Or install through your agent's own marketplace:

| Agent | Install |
| --- | --- |
| Claude Code | `/plugin marketplace add Dynamsoft/dynamsoft-skills` then `/plugin install dynamsoft-sdk@dynamsoft-plugins` |
| Cursor | `/add-plugin dynamsoft-sdk`, or the marketplace listing |
| Codex CLI | `codex plugin marketplace add Dynamsoft/dynamsoft-skills` then `codex plugin add dynamsoft-sdk@dynamsoft-plugins` |
| DeepSeek Harness | `npm i @dynamsoft/dsh-plugin`, or copy the skills (see `dsh/README.md`) |

## Skills

| Skill | Platform | Capabilities |
| --- | --- | --- |
| `dynamsoft-sdk` | — | Product/package choice, license key, routing, version baseline |
| `capture-vision-web` | JS/TS, React, Vue, Angular, Next | barcode, document, MRZ, label, PDF |
| `capture-vision-mobile` | Android, iOS, Flutter, React Native, MAUI | barcode, document, MRZ, label, camera |
| `capture-vision-desktop` | Python, .NET, Java, C++, Node.js, Electron | barcode, document, MRZ, label, batch |
| `web-twain` | Browser + service/REST | TWAIN/SANE/WIA/ICA/eSCL acquisition |
| `document-viewer` | Browser | View, annotate, export |
| `sdk-migration` | All | ZXing, ML Kit, Scandit, older DBR/DCV |
| `barcode-template-optimizer` | All | Decode-rate tuning and reports |

Skills are split by **platform**, because that is how the SDK is packaged: one router per platform,
several capabilities selected by template. Barcode, document, MRZ and label capture therefore live in
the same platform skill — there is no separate `mrz-*` or `document-*` mobile skill.

Coverage of every published SDK, and what has been executed versus verified against sample code, is
tracked in [`docs/coverage.md`](docs/coverage.md).

## License keys

The plugin ships an MCP server, [`dynamsoft-license-mcp`](https://www.npmjs.com/package/dynamsoft-license-mcp),
that signs in to the Dynamsoft customer portal with the user's Google account and returns a trial
key. Every implementation skill points at it:

1. `get_trial_license` — returns the key, its expiry and a masked preview.
2. `get_license_guide` — returns the exact initialization call for the target platform.
3. `describe_license` — masked summary, format and expiry.
4. `get_trial_page_url` — the manual application page, as a fallback.

The first call opens a browser window for the Google sign-in; after that the session is reused.
Keys go into an environment variable (`DYNAMSOFT_LICENSE_KEY`), never into generated source, and the
skills instruct the agent to show only the masked form in conversation.

Dynamic Web TWAIN is the exception: it uses a `t0…` product key, which the same MCP issues when
asked for `product: "dwt"`.

## Version baseline

The skills target these versions (checked 2026-11-10):

| Package | Version |
| --- | --- |
| `dynamsoft-capture-vision-bundle` | 3.6.5000 |
| `dynamsoft-barcode-reader-bundle` | 11.6.5000 |
| Barcode Reader mobile | 11.6.4000 |
| Capture Vision mobile | 3.6.4000 |
| `dwt` | 19.5.0 |
| `dynamsoft-document-viewer` | 5.0.1 |
| `dynamsoft-mrz-scanner` | 4.1.0 |
| `dynamsoft-document-scanner` | 1.5.0 |
| `dynamsoft-capture-vision-for-node` | 3.6.4003 |

## Repository layout

```text
.claude-plugin/    Claude Code plugin and marketplace manifests
.cursor-plugin/    Cursor plugin and marketplace manifests
.codex-plugin/     Codex / OpenAI plugin manifest
.mcp.json          the license MCP server entry
skills/            one directory per skill
dsh/               @dynamsoft/dsh-plugin bundle (DeepSeek Harness)
scripts/verify.mjs manifest, frontmatter and bundle checks
```

## Development

```bash
node scripts/verify.mjs                    # manifests, frontmatter, DSH patch
node dsh/scripts/prepare-skills.mjs        # snapshot skills into the DSH bundle
node dsh/scripts/link-skills.mjs --dry-run # show where skills would be linked
```

Every skill's frontmatter is deliberately limited to `name` and `description` so the same file works
unchanged in Claude Code, Cursor, Codex and DeepSeek Harness. `whenToUse` and other provider-specific
keys are not used.

## Tests

`scripts/verify.mjs` runs on Linux, Windows and macOS in CI, and the SDK smoke tests decode the same
generated QR fixture through every language binding:

| Binding | Test | Tier |
| --- | --- | --- |
| Python | `tests/sdk-smoke/python/scan.py` | executed |
| Node.js | `tests/sdk-smoke/node/scan.mjs` | executed |
| Java | `tests/sdk-smoke/java/Scan.java` | executed |
| .NET | `tests/sdk-smoke/dotnet` | builds; decode runs in CI |

The workflow needs a repository secret named `DYNAMSOFT_LICENSE_KEY`; without it the SDK jobs are
skipped with a warning rather than failing. See [`docs/coverage.md`](docs/coverage.md) for the tier
of every product, platform and framework, and [`docs/e2e-2026-11-10.md`](docs/e2e-2026-11-10.md) for
the defects these runs already caught.

## License

MIT. Dynamsoft SDKs themselves are commercial products with their own licenses.
