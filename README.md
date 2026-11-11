# Dynamsoft agent skills

AI agent skills for integrating the [Dynamsoft](https://www.dynamsoft.com/) SDKs, plus a license
server that issues trial keys so generated code actually runs.

Each skill is scoped to one job — barcode scanning on web, mobile or server, MRZ, document capture,
Web TWAIN scanning, document viewing, migration, template tuning — and carries the code patterns,
licensing, pitfalls and sample links for that job. The agent loads only the one your prompt needs.

## Install

```bash
npx skills add Dynamsoft/dynamsoft-skills                    # pick skills interactively
npx skills add Dynamsoft/dynamsoft-skills --skill web-twain  # just one skill
```

`npx skills add` also targets OpenCode, Codex and other agents (`--agent opencode`); `--list` shows
the skills without installing.

Or install through your agent's own marketplace:

| Agent | Install |
| --- | --- |
| Claude Code | `/plugin marketplace add Dynamsoft/dynamsoft-skills` then `/plugin install dynamsoft-sdk@dynamsoft-plugins` |
| Cursor | `/add-plugin dynamsoft-sdk`, or the marketplace listing |
| Codex CLI | `codex plugin marketplace add Dynamsoft/dynamsoft-skills` then `codex plugin add dynamsoft-sdk@dynamsoft-plugins` |

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

Dynamic Web TWAIN reads the key from `Dynamsoft.DWT.ProductKey` instead of `initLicense`; the same
MCP issues it for `product: "dwt"` (or `"dwt-ddv"` together with Document Viewer).

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
scripts/verify.mjs manifest, frontmatter and encoding checks
```

## Privacy and data flow

The skills themselves are static text: they read nothing, send nothing, and run no code on their
own. The only component that talks to the network is the separate
[`dynamsoft-license-mcp`](https://github.com/Dynamsoft/dynamsoft-license-mcp) server, and only when
a skill asks it for a license key:

| Step | What happens | Where the data goes |
| --- | --- | --- |
| 1 | `get_trial_license` opens the Dynamsoft customer portal in your browser | your browser → `www.dynamsoft.com` |
| 2 | You sign in with Google | Google → the Dynamsoft portal (the portal's own OAuth) |
| 3 | The server reads the portal's session cookies over the DevTools protocol | local only |
| 4 | It calls three portal endpoints (`User/Info`, `Trial/GetCompanyRecordList`, `Trial/RequestFromWeb`) | local → `www.dynamsoft.com` |
| 5 | It stores the session and the key under `~/.dynamsoft-license-mcp` with owner-only permissions | local only |

- **No telemetry.** Neither the skills nor the server report usage anywhere.
- **No third-party services.** The only host contacted is `www.dynamsoft.com`; the server does not
  use an analytics or proxy service.
- **The key stays local.** It is never written to a log and never sent anywhere except the
  Dynamsoft portal that issued it. Tool responses include a masked form, and the skills instruct the
  agent to show only that.
- **You can decline the sign-in.** `get_trial_page_url` returns the official application page
  instead; apply there by hand and skip the MCP entirely.
- **Signing out** is deleting `~/.dynamsoft-license-mcp`.

Dynamsoft's own privacy policy: <https://www.dynamsoft.com/privacy/>.

## Development

```bash
node scripts/verify.mjs                    # manifests, frontmatter, BOM and mojibake
```

Contribution rules — skill structure, licence wording, and the checks to run — are in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Every skill's frontmatter is deliberately limited to `name` and `description` so the same file works
unchanged in Claude Code, Cursor and Codex.

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
