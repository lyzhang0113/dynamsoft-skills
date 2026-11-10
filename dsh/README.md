# dynamsoft-dsh-plugin

A DeepSeek Harness bundle in two parts:

1. **An MCP client row** for [`dynamsoft-license-mcp`](https://www.npmjs.com/package/dynamsoft-license-mcp),
   so the agent can issue a trial license key for the code it is writing.
2. **The Dynamsoft skills**, linked into the DSH user skill root.

## Install

```bash
npm i dynamsoft-dsh-plugin
```

Then add it to your profile's bundle list (`~/.dsh/profiles/<profile>/package.json`):

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dynamsoft-dsh-plugin"
      ]
    }
  }
}
```

Order matters: the patch layer is applied after the bundles above it, so a bundle that provides
`dsh-mcp-client` must come first. Both shipped profiles do.

The package's `postinstall` links the skills into `$DSH_HOME/skills` (default `~/.dsh/skills`). If
install scripts are blocked in your setup, run it yourself:

```bash
npx dynamsoft-dsh-link            # create the links
npx dynamsoft-dsh-link --dry-run  # show the plan
npx dynamsoft-dsh-link --remove   # unlink
npx dynamsoft-dsh-link --copy     # copy instead of linking (use when links are unavailable)
```

## Plugin market index

`index.json` in this directory is a format 1 market index, validated with
`parseMarketIndex` from `@deepseek-ai/dsh-plugin-market-index`. Add it to DSH to get the bundle
from the Discover tab or the `plugin_market` tool:

```text
https://raw.githubusercontent.com/Dynamsoft/dynamsoft-skills/main/dsh/index.json
```

The current entry installs from **Git, pinned to a commit**, so it works before the package is on
npm. Once `dynamsoft-dsh-plugin` is published, switch the version's `source` to
`{ "type": "npm" }` and drop the commit pin.

**Maintaining it:** the `commit` field is a release pin. After any change under `dsh/`, update it to
the new commit and re-validate:

```bash
npm exec --package=@deepseek-ai/dsh-plugin-market-index -- node -e '
  const { parseMarketIndex } = require("@deepseek-ai/dsh-plugin-market-index");
  const fs = require("node:fs");
  parseMarketIndex(JSON.parse(fs.readFileSync("dsh/index.json", "utf8")), "https://example.invalid/dsh/index.json");
  console.log("index ok");
'
```

`node scripts/verify.mjs` checks the same structure in CI without the dependency.

## What you get

**Tools** appear as `mcp__dynamsoft__<tool>`:

| Tool | Purpose |
| --- | --- |
| `mcp__dynamsoft__get_trial_license` | Issue or reuse a trial key for a product and edition |
| `mcp__dynamsoft__get_license_guide` | Platform-specific initialization snippet |
| `mcp__dynamsoft__describe_license` | Masked summary, format and expiry |
| `mcp__dynamsoft__get_trial_page_url` | Manual application page |

**Skills** appear in the session catalog like any other skill:

`dynamsoft-sdk`, `capture-vision-web`, `capture-vision-mobile`, `capture-vision-desktop`,
`web-twain`, `document-viewer`, `sdk-migration`, `barcode-template-optimizer`.

## What the patch layer does

`cordis.patch.yml` adds exactly one row — the MCP client entry — with:

- `serverName: dynamsoft` (the namespace in the tool names)
- `toolCallTimeoutMs: 180000` (the default 60 s is shorter than the Google sign-in window)
- `failOnStartupError: false` (a missing server must not stop the harness)

Skills are deliberately **not** mounted through the patch: `bundledSkillDir` is resolved relative to
the harness working directory, which is not a stable place to point at from a package. Linking into
`$DSH_HOME/skills` (rank 400) uses the documented user skill root instead and needs no path
expression.

## First use

Ask for something that needs a license, for example:

> Write a Python script that reads barcodes from an image with the current Dynamsoft SDK.

The first `get_trial_license` call opens the Dynamsoft Google sign-in in your browser. Sign in, then
the call completes and returns the key. Later calls reuse the saved session; nothing opens.

## Verify

```bash
npm run verify                    # from this directory: manifest + patch checks
npx dynamsoft-dsh-link --dry-run  # confirm the skill links
```

In the harness, confirm both halves:

- `mcp__dynamsoft__get_trial_page_url` returns a URL (proves the MCP connection).
- The session skill catalog lists `dynamsoft-sdk` (proves skill discovery).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| No `mcp__dynamsoft__*` tools | `npx` not on PATH, or Node < 22. Run `npx -y dynamsoft-license-mcp` once to see the error. |
| Tools exist but calls time out | Raise `toolCallTimeoutMs`; the first call waits for a human sign-in. |
| Skills missing from the catalog | Links not created, or `$DSH_HOME` points elsewhere. Run `npx dynamsoft-dsh-link` and check `~/.dsh/skills`. |
| Old skill content | Re-run `npm i dynamsoft-dsh-plugin`, then `npx dynamsoft-dsh-link --remove && npx dynamsoft-dsh-link`. |
| Harness fails to start after adding the bundle | Remove the bundle from `dsh.profile.bundles`; the patch only adds rows, so a startup failure points at a missing dependency rather than a config value. |

## Uninstall

```bash
npx dynamsoft-dsh-link --remove
npm rm dynamsoft-dsh-plugin
```

Then drop it from `dsh.profile.bundles`.
