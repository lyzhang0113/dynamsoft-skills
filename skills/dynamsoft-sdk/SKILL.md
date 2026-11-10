---
name: dynamsoft-sdk
description: Choose and license the right Dynamsoft SDK before writing code. Covers Barcode Reader vs Capture Vision, Web TWAIN, Document Viewer, MRZ and Document Scanner boundaries, current package versions, how to get a trial license key through the license MCP, and which implementation skill to use next.
---

# Dynamsoft SDK

Use this skill when the product, the package, or the license is still open. It contains no
platform integration code; it decides what to build and how to license it, then hands off.

## 1. Pick the capability

Capture Vision is **one SDK per platform** whose modules cover four capabilities: barcode, document,
MRZ and zoned text. The capability is selected by the template string, not by a different package, so
"which product" and "which platform" are two separate questions.

| The user needs | Capability | Module |
| --- | --- | --- |
| Barcodes, QR, DataMatrix, PDF417, MaxiCode | Barcode | Barcode Reader |
| Document edge detection, crop, deskew, cleanup | Document | Document Normalizer |
| MRZ from passports, ID cards, visas | MRZ | MRZ model on Label Recognizer |
| Zoned text: price tags, VIN plates, label fields | Text | Label Recognizer |
| Typed fields from a raw string (VIN, GS1 AI, AAMVA) | Parsing | Code Parser |

Then pick the packaged product, which changes *what you install*, not how you call it:

| Situation | Product |
| --- | --- |
| Only barcodes, smallest dependency | **DBR** — `dynamsoft-barcode-reader-bundle` |
| Barcodes plus any other capability | **DCV** — `dynamsoft-capture-vision-bundle` |
| A preset document scan screen, web only, no custom UX | **MDS** — `dynamsoft-document-scanner` |
| A preset MRZ scan screen, no custom UX | **MRZ Scanner** — web and mobile SDKs |
| A ready-made multi-barcode scanning app, no code | **BBS** — Android/iOS app, not an SDK |
| Physical scanner in a browser | **DWT** |
| Document viewer in a browser | **DDV** |

Two capability facts that are commonly answered wrong:

- **A custom document or MRZ experience is a Capture Vision job.** The Document Scanner (MDS) and
  MRZ Scanner SDKs are packaged flows; the moment the UX or workflow has to be different, build it
  on the Capture Vision templates (`DetectAndNormalizeDocument_Default`, `ReadPassportAndId`).
- **There is no standalone full-page OCR SDK.** The OCR add-on belongs to Dynamic Web TWAIN and is
  used alongside it, typically on a desktop or workstation. Short text in known regions (labels,
  cards, printed VIN plates) is read by the Dynamsoft Label Recognizer, a DCV component.
- **AAMVA driver licenses are read by DBR**, which decodes the PDF417 and parses the fields.
  Passports and ID cards with an MRZ zone are MRZ Scanner / DCV.

## 2. Pick the package: DBR or DCV

| | DBR | DCV |
| --- | --- | --- |
| Package | `dynamsoft-barcode-reader-bundle` (JS), `dynamsoft-barcode-reader-bundle` (pip) | `dynamsoft-capture-vision-bundle` |
| Contains | Barcode engine only | Barcode + document normalization + label/MRZ recognition |
| Size | Smaller | Larger |
| Entry point | `CaptureVisionRouter` | `CaptureVisionRouter` |

DBR is a **submodule of DCV**, not a legacy product: the barcode engine is identical, and the same
`CaptureVisionRouter` code works with either package after changing the import. Pick DBR when the
task is barcode-only; pick DCV the moment a second capability is needed.

## 3. Get a license key

Every SDK in this family needs a key before it will run. **Never hardcode a real key and never ask
the user to paste one into the conversation.**

### With the license MCP (preferred)

Call `get_trial_license` with the product and the edition that matches the app:

| Product argument | Edition (`package`) |
| --- | --- |
| `dcv` (default), `dbr`, `mrz`, `mds` | `cross-platform`, `web`, `mobile`, `desktop` |
| `dwt`, `ddv` | `web` |

The call returns `licenseKey`, `licenseKeyMasked`, `expirationDate` and `source`.

**The edition must match where the code runs.** The runtime enforces it: a `desktop` key used in a
browser fails with `[License] License mismatch: Browser requested`. Ask for `web` for a browser app,
`mobile` for a phone app, and `cross-platform` when the same key has to serve both.

**One key covers the products.** A key issued for one product licenses the others too — in testing a
Capture Vision cross-platform key licensed the Barcode Reader web bundle without complaint. Reuse the
key you already have instead of requesting one per product; only the edition has to be right.

Do not classify a key by its prefix. Current keys start with `DLS`, but older or product-specific
entries in an account can look different, and the prefix alone does not tell you what the key
licenses. `describe_license` reports what you actually hold.

- **`status: "ok"`** — write `licenseKey` into an environment variable (see below) and show only
  `licenseKeyMasked` in the conversation.
- **`status: "login_required"`** — a browser window opened on the Dynamsoft Google sign-in. Ask the
  user to finish signing in, then call `get_trial_license` **again**. The session is captured, so
  there is no second sign-in. Do not switch to another approach while this is pending.
- **MCP not available** — call `get_trial_page_url` and hand the URL to the user, or use
  `https://www.dynamsoft.com/customer/license/trialLicense/?product=<product>&package=<package>`.

Then call `get_license_guide` with the product and platform to get the exact initialization call
for that stack, and `describe_license` to show a masked summary or the expiry.

### Wiring the key

Always through configuration, never as a literal:

| Where | Variable |
| --- | --- |
| Node / web build | `DYNAMSOFT_LICENSE_KEY` exposed by the bundler (`VITE_`, `NEXT_PUBLIC_`, …) |
| Python | `DYNAMSOFT_LICENSE_KEY` |
| .NET / Java / C++ | `DYNAMSOFT_LICENSE_KEY` |
| Android | `BuildConfig` field fed from a local `gradle.properties`, never committed |
| iOS / Flutter / RN | a secrets file excluded from version control |

DWT takes the same license key, assigned to `Dynamsoft.DWT.ProductKey`, and the DWT service on the
host must be configured with the same key.

## 4. Open the implementation skill

Skills are split by **platform**, not by capability, because that is how the SDK is packaged and
installed: one router class, one asset tree, several templates. MRZ and document capture therefore
live inside the platform skill, not in separate ones.

| Target | Skill | Covers |
| --- | --- | --- |
| Browser: JS/TS, React, Vue, Angular, Next | `capture-vision-web` | barcode, document, MRZ, label, PDF |
| Android, iOS, Flutter, React Native, MAUI | `capture-vision-mobile` | barcode, document, MRZ, label, camera |
| Python, .NET, Java, C++, Node.js, Electron | `capture-vision-desktop` | barcode, document, MRZ, label, batch/PDF |
| Physical scanner acquisition, including the REST service | `web-twain` | TWAIN/SANE/WIA/ICA/eSCL, service, REST |
| In-browser document viewer and annotation | `document-viewer` | DDV viewer/editViewer, export |
| Replacing ZXing / ML Kit / Scandit, or a version upgrade | `sdk-migration` | API mapping, RTU → core, v9 → v11 |
| Improving decode rate on hard images | `barcode-template-optimizer` | template tuning, reports |

If a request crosses platforms (for example "scan on the phone and review on the web"), read two
skills and state which file each part belongs to.

Read only the one you need, plus its `references/` when the answer depends on platform detail.

## 5. Version baseline

Checked 2026-11-10. Treat anything older in an existing project as a possible upgrade case, and
prefer these when generating new code.

| Package | Version |
| --- | --- |
| `dynamsoft-capture-vision-bundle` (npm / pip) | 3.6.5000 |
| `dynamsoft-barcode-reader-bundle` (npm / pip) | 11.6.5000 |
| `dynamsoft-barcode-reader` mobile (Android/iOS/Flutter/RN/MAUI) | 11.6.4000 |
| `dynamsoft-capture-vision` mobile | 3.6.4000 |
| `dwt` | 19.5.0 |
| `dynamsoft-document-viewer` | 5.0.1 |
| `dynamsoft-mrz-scanner` | 4.1.0 |
| `dynamsoft-document-scanner` | 1.5.0 |
| `dynamsoft-capture-vision-for-node` | 3.6.4003 |

## Rules that prevent most bad answers

1. **Use the core API, not the RTU wrappers.** `BarcodeScanner`, `BarcodeReader`, `DocumentScanner`
   and `MRZScanner` are ready-to-use components with a fixed UI and almost no programmability.
   Production code uses `CaptureVisionRouter` + `CameraEnhancer` + `CameraView` +
   `CapturedResultReceiver`. Mention RTU only as a prototype shortcut, with that caveat.
2. **Never invent API names.** If a class or method is uncertain for the user's version, say what
   needs checking and link the official sample instead.
3. **Sample first.** Name the sample family the code is based on.
4. **Self-host SDK assets.** Do not load wasm/models from a third-party CDN at runtime in code you
   generate; copy the installed package's `dist` into the app's static assets.
5. **Clean up.** Dispose routers, enhancers, views and workers; remove listeners; handle
   React `StrictMode` double-mounting.
6. **Camera needs a secure context** — HTTPS or `http://localhost`, and a user gesture on mobile
   browsers.
