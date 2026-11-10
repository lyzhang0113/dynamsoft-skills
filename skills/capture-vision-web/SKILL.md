---
name: capture-vision-web
description: Dynamsoft SDKs in the browser with JavaScript and TypeScript. Covers barcode and QR scanning, MRZ and passport reading, document edge detection and normalization, label text recognition, PDF input, React/Vue/Angular/Next asset paths, licensing, and the camera and cleanup pitfalls that break web capture.
---

# Capture Vision on the web

One package, one router, several capabilities. The capability is chosen by the **template string**
you pass to `capture()` / `startCapturing()`, not by a different API:

| Capability | Template |
| --- | --- |
| Barcodes / QR | `ReadBarcodes_Default` (`ReadSingleBarcode`, `ReadBarcodes_SpeedFirst`, `ReadBarcodes_ReadRateFirst`) |
| Document boundaries | `DetectDocumentBoundaries_Default` |
| Boundaries + normalization | `DetectAndNormalizeDocument_Default` |
| Normalize with your own corners | `NormalizeDocument_Default` |
| MRZ (passport / ID) | `ReadPassportAndId` (`ReadPassport`, `ReadId`) |
| Text lines / labels | `RecognizeTextLines_Default` |

## Which package

| Need | Package | Version |
| --- | --- | --- |
| Barcode only | `dynamsoft-barcode-reader-bundle` | 11.6.5000 |
| Barcode + document + MRZ + labels | `dynamsoft-capture-vision-bundle` | 3.6.5000 |
| A preset document scan screen (no custom UX) | `dynamsoft-document-scanner` | 1.5.0 |
| A preset MRZ scan screen (no custom UX) | `dynamsoft-mrz-scanner` | 4.1.0 |

The first two expose the same classes (`LicenseManager`, `CaptureVisionRouter`, `CameraEnhancer`,
`CameraView`, `CapturedResultReceiver`); only the import changes. The last two are higher-level
products with a preset UI. Use them when that screen is exactly what the product needs; **any
custom UX or workflow must use the Capture Vision native interfaces** (`CaptureVisionRouter` +
templates), not these wrappers.

```bash
npm install dynamsoft-capture-vision-bundle@3.6.5000
```

Do not install `dynamsoft-barcode-reader`, which stopped at v10.

## License

1. `get_trial_license` with the product (`dcv` for the full bundle, `dbr` for barcode-only, `mds`
   for the Document Scanner, `mrz` for the MRZ Scanner) and `package: "web"`.
2. `status: "login_required"` means a browser window opened — ask the user to finish the Google
   sign-in, then call again. The session is reused.
3. Store `licenseKey` in a build-time environment variable (`VITE_DYNAMSOFT_LICENSE_KEY`,
   `NEXT_PUBLIC_…`) and show only `licenseKeyMasked` in chat.
4. `get_license_guide` with `platform: "web"` returns the init call for the package you chose.

Never put a literal key in generated source, and never load it from a URL or a checked-in file.

```js
import { LicenseManager } from "dynamsoft-capture-vision-bundle";
await LicenseManager.initLicense(import.meta.env.VITE_DYNAMSOFT_LICENSE_KEY);
```

## Camera scanner (barcode)

Self-host the bundle so wasm and models come from the app's own origin:

```bash
mkdir -p public
cp node_modules/dynamsoft-capture-vision-bundle/dist/dcv.bundle.min.js public/
```

```html
<script src="./dcv.bundle.min.js"></script>
<div id="camera" style="width:100%;max-width:640px;height:480px"></div>
<div id="results">Starting…</div>

<script>
(async () => {
  const { LicenseManager, CaptureVisionRouter, CameraEnhancer, CameraView } = Dynamsoft.CVR;

  await LicenseManager.initLicense(window.DYNAMSOFT_LICENSE_KEY);

  const view = await CameraView.createInstance();
  document.getElementById("camera").appendChild(view.getUIElement());

  const enhancer = await CameraEnhancer.createInstance(view);
  const router = await CaptureVisionRouter.createInstance();
  router.setInput(enhancer);

  router.addResultReceiver({
    onDecodedBarcodesReceived: (result) => {
      const items = result.items ?? [];
      if (items.length === 0) return;
      document.getElementById("results").textContent =
        items.map((item) => `[${item.formatString}] ${item.text}`).join(" | ");
    }
  });

  await enhancer.open();
  await router.startCapturing("ReadBarcodes_Default");
})().catch((error) => {
  document.getElementById("results").textContent = `Error: ${error.message ?? error}`;
});
</script>
```

## Images and PDFs

Same router, no camera:

```js
import { CaptureVisionRouter, EnumCapturedResultItemType } from "dynamsoft-capture-vision-bundle";

const router = await CaptureVisionRouter.createInstance();
const result = await router.capture(blob, "ReadBarcodes_Default");

for (const item of result.items ?? []) {
  if (item.type !== EnumCapturedResultItemType.CRIT_BARCODE) continue;
  console.log(item.formatString, item.text, item.location);
}
```

Verified against `dynamsoft-barcode-reader-bundle` 11.6.5000 and
`dynamsoft-capture-vision-bundle` 3.6.5000:

- `capture()` accepts a **`Blob`**, a URL string, a base64 string, an `HTMLImageElement`,
  `HTMLCanvasElement` or `HTMLVideoElement`. It does **not** accept a `Uint8Array` — passing one
  throws `Type of 'imageOrFile' should be ...`.
- There is no `result.barcodeResultItems` on these builds. Iterate `result.items` and filter on
  `item.type`, or read `result.decodedBarcodesResult.items` from a receiver callback.
- For a PDF, render the pages (pdf.js) and capture each page as a blob — the web build does not page
  through a PDF by itself.

## Document capture

Document and MRZ templates ship **only with the Capture Vision bundle**. Asking the barcode-only
`dynamsoft-barcode-reader-bundle` for `DetectDocumentBoundaries_Default` fails with
`[capture] [-10036] The template name is invalid.` — a common wrong turn when the project installed
the smaller package.

```js
import { CaptureVisionRouter, EnumCapturedResultItemType } from "dynamsoft-capture-vision-bundle";

const result = await router.capture(blob, "DetectAndNormalizeDocument_Default");

for (const item of result.items ?? []) {
  switch (item.type) {
    case EnumCapturedResultItemType.CRIT_DETECTED_QUAD:      // corners of the page
      console.log(item.location?.points);
      break;
    case EnumCapturedResultItemType.CRIT_DESKEWED_IMAGE:     // corrected image
      console.log(item.image ?? item);
      break;
  }
}
```

Result item types in this build: `CRIT_ORIGINAL_IMAGE = 1`, `CRIT_BARCODE = 2`, `CRIT_TEXT_LINE = 4`,
`CRIT_DETECTED_QUAD = 8`, `CRIT_DESKEWED_IMAGE = 16`, `CRIT_PARSED_RESULT = 32`,
`CRIT_ENHANCED_IMAGE = 64`. Check `item.type` rather than relying on an aggregate getter.

No item means "no document found in this frame" — a normal result, not an error. For a live flow, run
`DetectDocumentBoundaries_Default` while framing and call `capture()` with
`DetectAndNormalizeDocument_Default` only when the user confirms; normalizing every frame is
expensive.

Resolution matters: a 640×480 frame cannot produce a readable A4 page. Request 1920×1080 or higher
and capture from a still frame.

## MRZ

```js
import { CaptureVisionRouter, EnumCapturedResultItemType } from "dynamsoft-capture-vision-bundle";

const result = await router.capture(blob, "ReadPassportAndId");

const parsed = (result.items ?? []).find(
  (item) => item.type === EnumCapturedResultItemType.CRIT_PARSED_RESULT
);
if (parsed) {
  console.log(parsed.codeType);                        // MRTD_TD1_ID | MRTD_TD2_ID | MRTD_TD3_PASSPORT
  console.log(parsed.getFieldValue("documentNumber"));
  console.log(parsed.getFieldValue("dateOfExpiry"));
}
```

MRZ templates, like document templates, are only in the Capture Vision bundle — the barcode-only
bundle rejects them as an invalid template name.

Field names are camelCase: `documentType`, `firstName`, `lastName`, `sex`, `nationality`,
`documentNumber`, `dateOfBirth`, `dateOfExpiry`, `issuingState`. `ReadPassport` on an ID card
returns nothing — default to `ReadPassportAndId`.

The MRZ Scanner web SDK (`dynamsoft-mrz-scanner`) carries its own scan UI and pipeline — use it
when that screen fits. When the MRZ UX or workflow must be custom, use the templates above
instead; the packaged scanner is not designed to be reshaped.

## Labels and structured content

`RecognizeTextLines_Default` returns text-line items for zonal text (price tags, VIN plates, ID
cards). Pair it with the Code Parser to turn raw strings into typed fields — for example VIN, GS1 AI,
AAMVA. Ask for the specific parser you need rather than writing a regex by hand when a parser exists.

## Bundler apps

A bundler hides the SDK's own script URL, so the engine fetches `*.wasm` from the app origin, gets
`index.html`, and the browser reports `Unexpected token '<'`. Set the root **before** `initLicense`:

```ts
import { CoreModule } from "dynamsoft-capture-vision-bundle";
CoreModule.engineResourcePaths.rootDirectory = "/dynamsoft/";
```

The property is `rootDirectory`, not `root`. Copy assets under the path the SDK appends:

```bash
mkdir -p public/dynamsoft/dynamsoft-capture-vision-bundle@3.6.5000
cp -r node_modules/dynamsoft-capture-vision-bundle/dist \
      public/dynamsoft/dynamsoft-capture-vision-bundle@3.6.5000/
```

`references/frameworks.md` has the React hooks pattern (with `StrictMode` handling) and the same
lifecycle translated to Vue and Angular.

## Pitfalls

1. **Camera needs a secure context** — HTTPS or `http://localhost`, otherwise `getUserMedia` is
   undefined and nothing starts.
2. **Dispose everything** — `router.dispose()`, `enhancer.dispose()`, `view.dispose()`, and empty the
   container. React `StrictMode` mounts twice in development and leaks a camera stream otherwise.
3. **`startCapturing` needs an open enhancer** — open the camera first.
4. **Do not default to the RTU wrappers** (`BarcodeScanner`, `DocumentScanner`, `MRZScanner`). They
   have a fixed UI and little control; use `CaptureVisionRouter` for anything real.
5. **One router per scanner instance**; reusing a disposed router throws.
6. **Templates are strings** — enums are convenience wrappers whose `.value` is the string.

## Verify

- `initLicense` resolves before any capture call.
- No 404 for `*.wasm` or `*.worker.js` in the network panel.
- The camera indicator turns off after unmount.
- A still image decodes in the same page, which separates camera problems from decode problems.

## Samples

- JavaScript barcode samples: https://github.com/Dynamsoft/barcode-reader-javascript-samples
- Document Normalizer samples: https://github.com/Dynamsoft/document-normalizer-javascript-samples
- Label Recognizer samples: https://github.com/Dynamsoft/label-recognizer-javascript-samples
- Code Parser samples: https://github.com/Dynamsoft/code-parser-javascript-samples
- Document Scanner: https://github.com/Dynamsoft/document-scanner-javascript
- MRZ Scanner JS: https://github.com/Dynamsoft/mrz-scanner-javascript
- Barcode + MRZ + document in one page:
  https://github.com/yushulx/javascript-barcode-qr-code-scanner/tree/main/examples/barcode_mrz_document
