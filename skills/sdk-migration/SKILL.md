---
name: sdk-migration
description: Move a project onto Dynamsoft from ZXing, ML Kit, Scandit or an older DBR version. Covers API mapping for barcode readers, the ready-to-use to core API upgrade, DBR v9 to v11 renames, Capture Vision major versions, and the licence change that comes with the switch.
---

# Migrating to Dynamsoft

Use this skill when the user is not starting fresh: they already scan with something else, or they
have an aging Dynamsoft integration and want the current API.

Read `references/migration.md` for the full mapping tables and the per-library notes.

## Identify the source, then map

| Source | Migration shape |
| --- | --- |
| ZXing / zxing-js | Decode-and-return becomes `CaptureVisionRouter.capture()`; symbology hints become template settings |
| ML Kit (Android) | `BarcodeScanning` processor becomes `CaptureVisionRouter` + `CameraEnhancer` |
| Scandit | `BarcodeCapture`/`SparkScan` becomes `CaptureVisionRouter` + `CameraView`; licensing moves from Scandit account to a Dynamsoft key |
| DBR v9 and earlier | class and method renames around the Capture Vision router |
| DCV 2.x | preset template strings and result item types changed |
| RTU wrappers (`BarcodeScanner`, `BarcodeReader`) | move to the core API for control |

## The three change patterns

1. **Decode API** — most third-party libraries take an image and return a list of strings. The
   Dynamsoft equivalent returns typed result items with text, format, and corner coordinates. Map the
   call once, then the rest of the app keeps working.
2. **Camera ownership** — third-party libraries often own the camera. With Capture Vision you create
   `CameraView` and `CameraEnhancer` yourself, which is why migration is mostly a wiring change in the
   view layer, not in the business logic.
3. **Licensing** — every Dynamsoft SDK needs a key at startup. Add it once, from configuration; see
   the license section below.

## DBR v9 → v11 renames

| v9 | v11 |
| --- | --- |
| `BarcodeReader.initLicense(key)` | `LicenseManager.initLicense(key)` |
| `BarcodeReader.decode(image)` | `CaptureVisionRouter.capture(image, template)` |
| `reader.getRuntimeSettings()` / `updateRuntimeSettings()` | template JSON via `initSettings` or a template file |
| `results[i].BarcodeText` | `BarcodeResultItem.get_text()` / `.text` |

Do not invent bridge names for anything older than v9 — point at the official sample for that
version instead of guessing.

## RTU → core API

If the project uses `BarcodeScanner.createInstance()` or `BarcodeReader.createInstance()`:

1. Replace the instance with `CaptureVisionRouter.createInstance()`.
2. Create `CameraView` and `CameraEnhancer` explicitly — the wrapper was hiding them.
3. Register `addResultReceiver({ onDecodedBarcodesReceived })`.
4. Start with a template string (`"ReadBarcodes_Default"`).
5. Delete the wrapper's UI hooks; the core API does not render a preset UI.

The decode behaviour is preserved; what changes is who owns the pipeline.

## Licence

Call `get_trial_license` with the product the migrated code targets (`dbr` or `dcv`, plus `mrz`,
`ddv`, `dwt` if those are part of the app) and the edition matching the platform. If it returns
`status: "login_required"`, the browser window is waiting — have the user sign in and call again.
Keep the key in configuration and show only `licenseKeyMasked`.

A migration also changes **which** licence is used: a Scandit account key becomes a Dynamsoft key,
and that key is edition-scoped rather than product-scoped — one key covers the Dynamsoft products,
but a `desktop` key will not license a browser runtime.

## Migration checklist

1. Inventory every call site of the old SDK (search the package name, not the class names).
2. Replace the decode call and keep the old result shape behind an adapter so the rest of the app
   does not change in the same commit.
3. Move camera ownership out of the old library; add the view/enhancer pair.
4. Add the Dynamsoft license init at startup.
5. Delete the old dependency and its permissions/plist entries.
6. Re-run the app's own scanning tests; compare decode results on the same fixtures before and after.

## Pitfalls

- **Half-migrations** — leaving the old library installed alongside the new one doubles camera
  contention and confuses bundle size analysis.
- **Symbology drift** — ZXing and ML Kit enable a different default set. If only some codes stop
  decoding, set the formats explicitly in the template rather than assuming a regression.
- **Permissions** — the old library's manifest/plist entries usually stay behind; remove them, and
  confirm the new camera permission is declared.
- **Licence timing** — initialising the SDK after the first capture call produces confusing failures.

## Samples

- Migration reference: `references/migration.md`
- DBR JavaScript samples: https://github.com/Dynamsoft/barcode-reader-javascript-samples
- Mobile samples: https://github.com/Dynamsoft/barcode-reader-mobile-samples
