# Dynamic Web TWAIN (DWT)

Use DWT for browser-based document scanning and image acquisition from scanners and capture devices. It is appropriate for TWAIN/SANE/ICA/WIA/eSCL scanner control, scan-to-PDF/TIFF workflows, image buffer operations, upload, and browser scanner integration.

Official docs: https://www.dynamsoft.com/web-twain/docs/
API reference: https://www.dynamsoft.com/web-twain/docs/info/api/
Official samples: https://github.com/Dynamsoft/web-twain-samples
Additional sample index: `references/samples.md` in the `dynamsoft-sdk` skill

API names below were checked against the type definitions shipped in `dwt@19.5.0` (`dist/types/`).

## Sample-first links

- Web TWAIN samples: https://github.com/Dynamsoft/web-twain-samples
- Dynamic Web TWAIN package/repo: https://github.com/Dynamsoft/Dynamic-Web-TWAIN
- React advanced: https://github.com/Dynamsoft/web-twain-react-advanced
- React advanced mode: https://github.com/Dynamsoft/web-twain-react-advanced-mode
- Angular advanced: https://github.com/Dynamsoft/web-twain-angular-advanced
- Angular CLI: https://github.com/Dynamsoft/web-twain-angular-cli-application
- Vue advanced: https://github.com/Dynamsoft/web-twain-vue-advanced
- DWT REST .NET: https://github.com/Dynamsoft/Dynamic-Web-TWAIN-REST-dotnet

When generating DWT code, pick the closest framework sample first, then adapt it.

## Route DWT requests by setup style

- npm / framework app (default): install `dwt`, copy the **contents** of `node_modules/dwt/dist` to the app's public folder, set `ResourcesPath`, set `AutoLoad = false`, then call `Load()`.
- CDN prototype: UNPKG (not jsDelivr — its file-size limit blocks the service installers), with the same pinned version in the script URL and `ResourcesPath`.
- Official SDK installer / intranet: reference the installer's `Resources` folder and load `dynamsoft.webtwain.initiate.js` plus `dynamsoft.webtwain.config.js`. That `config.js` already sets `AutoLoad = true`, a default `dwtcontrolContainer` and a trial key; edit it instead of repeating the settings in the page.

## Global config (`Dynamsoft.DWT.*`)

Set these **before** `Load()`. Getting them wrong is the most common setup failure.

| Property | Purpose |
| --- | --- |
| `ProductKey` | Licence key (from configuration, never a literal) |
| `ResourcesPath` | Served URL of the copied `dist` contents |
| `AutoLoad` | Load on page load; set `false` and call `Load()` yourself in bundled apps |
| `Containers` | `[{ ContainerId, Width, Height }]`; each container gets its own `WebTwain` instance |
| `ServiceInstallerLocation` | URL of the service installers when not served from `ResourcesPath` |
| `UseDefaultViewer` | `false` for headless scanning with your own image display |

| Method | Purpose |
| --- | --- |
| `Dynamsoft.DWT.Load()` | Start the SDK; returns a promise, but use `OnWebTwainReady` for the instance |
| `Dynamsoft.DWT.RegisterEvent("OnWebTwainReady", fn)` | Global ready event — the only event to register globally |
| `Dynamsoft.DWT.GetWebTwain(containerId)` | The `WebTwain` instance bound to a container |
| `Dynamsoft.DWT.Unload()` | Tear down; call on SPA unmount |

## Minimal browser scanning pattern

Install and self-host the runtime (done once at build time; the page then loads it from your own origin):

```bash
npm install dwt
mkdir -p public/dwt-resources
cp -r node_modules/dwt/dist/. public/dwt-resources/   # contents of dist, src/ included
```

```html
<script src="./dwt-resources/dynamsoft.webtwain.min.js"></script>
<div id="dwtcontrolContainer"></div>
<button onclick="scan()">Scan</button>
<script>
  Dynamsoft.DWT.AutoLoad = false;
  Dynamsoft.DWT.ProductKey = window.DYNAMSOFT_LICENSE_KEY;
  Dynamsoft.DWT.ResourcesPath = "./dwt-resources";
  Dynamsoft.DWT.Containers = [{ ContainerId: "dwtcontrolContainer", Width: "360px", Height: "480px" }];

  let dwtObject;
  Dynamsoft.DWT.RegisterEvent("OnWebTwainReady", function () {
    dwtObject = Dynamsoft.DWT.GetWebTwain("dwtcontrolContainer");
  });
  Dynamsoft.DWT.Load();

  async function scan() {
    if (!dwtObject) return;
    try {
      await dwtObject.SelectSourceAsync();
      await dwtObject.AcquireImageAsync({
        IfShowUI: false,
        IfCloseSourceAfterAcquire: true,
        Resolution: 200,
        PixelType: Dynamsoft.DWT.EnumDWT_PixelType.TWPT_GRAY,
        IfFeederEnabled: true,
        IfDuplexEnabled: false
      });
    } catch (e) {
      console.error(e);
      alert(e.message || e);
    }
  }
</script>
```

## `AcquireImageAsync` options

| Option | Type | Purpose |
| --- | --- | --- |
| `IfShowUI` | boolean | Show the driver's own dialog |
| `IfCloseSourceAfterAcquire` | boolean | Release the scanner when the batch ends |
| `PixelType` | `EnumDWT_PixelType` | `TWPT_BW`, `TWPT_GRAY`, `TWPT_RGB` |
| `Resolution` | number | DPI; 200 for documents, 300 for OCR |
| `IfFeederEnabled` | boolean | Use the ADF instead of the flatbed |
| `IfDuplexEnabled` | boolean | Scan both sides |

`SelectSourceAsync(deviceType?)` shows the source dialog; `GetDevicesAsync(deviceType?, refresh?)` plus `SelectDeviceAsync(device)` select without it.

## Framework lifecycle (React, Vue, Angular)

| Step | React | Vue | Angular |
| --- | --- | --- | --- |
| Configure + `Load()` | `useEffect(() => …, [])` | `onMounted` | `ngOnInit` |
| Keep the instance | `useRef` | a plain variable or `shallowRef` (a deep `ref()` proxies the SDK object) | a component field |
| `Dynamsoft.DWT.Unload()` | the effect's cleanup | `onUnmounted` | `ngOnDestroy` |

- Guard against a second initialization (React Strict Mode runs effects twice in development).
- Copy the contents of `node_modules/dwt/dist` into the public/static folder (`public/` for Vite/CRA/Vue CLI, an `assets` entry in `angular.json` for Angular), and set `ResourcesPath` to the served URL, not a filesystem path.
- Only one `WebTwain` instance per container element; the container must exist in the DOM before `Load()`.

## Local files, saving and editing

```js
dwtObject.IfShowFileDialog = true;
dwtObject.LoadImageEx("", Dynamsoft.DWT.EnumDWT_ImageType.IT_ALL,   // "" opens the file dialog
  () => console.log("loaded"),
  (code, message) => console.error(message));

dwtObject.SaveAsPDF("scan.pdf", dwtObject.CurrentImageIndexInBuffer,
  () => console.log("saved"),
  (code, message) => console.error(message));   // also SaveAsJPEG, SaveAsPNG, SaveAsBMP, SaveAsTIFF

const i = dwtObject.CurrentImageIndexInBuffer;
dwtObject.RotateRight(i);   // RotateLeft, Mirror, Flip, Crop(i, left, top, right, bottom)
```

## Common DWT pitfalls

- `ResourcesPath` points to a filesystem path instead of a served URL.
- `cp -r node_modules/dwt/dist public/dwt-resources/` into an existing folder nests everything under `dwt-resources/dist/`; copy `dist/.` instead.
- CDN script is loaded but service installer path or resources are misconfigured.
- Local `dynamsoft.webtwain.config.js` already sets config; duplicate page-level config causes confusion.
- Scanner service is not installed/running.
- Browser security or OS permissions block scanner/camera access.
- The scanner UI is hidden with `IfShowUI: false` but the device requires vendor UI for some settings.
- Index operations use zero-based image indexes.
- **`GetImageURL()` returns URLs tied to the internal buffer — they become invalid after `RemoveAllImages()`.** Use `ConvertToBlob()` instead when you need images to persist beyond buffer operations (see "Extracting images without the DWT viewer" below).
- **`ResourcesPath` directory structure must mirror `node_modules/dwt/dist/`.** The DWT runtime dynamically loads files from `<ResourcesPath>/src/dynamsoft.webtwain.css`, `<ResourcesPath>/src/dynamsoft.webtwain.viewer.js`, etc. Copying files flat into the resources directory causes 404s.

## Extracting images without the DWT viewer

When you want to hide the DWT viewer and display scanned images as custom `<img>` elements, **never** use `GetImageURL()` then `RemoveAllImages()`. The URL from `GetImageURL()` is served by the DWT service and invalidated when the buffer is cleared.

Instead, use `ConvertToBlob()` to extract each image as a standalone `Blob`, then create an independent `ObjectURL`:

```javascript
function convertToBlobAsync(indices) {
  return new Promise(function (resolve, reject) {
    DWObject.ConvertToBlob(
      indices,
      Dynamsoft.DWT.EnumDWT_ImageType.IT_PNG,
      function (blob) { resolve(blob); },
      function (ec, es) { reject(new Error(es)); }
    );
  });
}

// After AcquireImageAsync resolves:
for (let i = 0; i < count; i++) {
  const blob = await convertToBlobAsync([i]);
  const url = URL.createObjectURL(blob);
  const img = document.createElement('img');
  img.src = url;
  container.appendChild(img);
}
// Now it is safe to clear the buffer
DWObject.RemoveAllImages();
```

`ConvertToBlob` API reference: https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Buffer.html

## Add-ons

All add-ons are reached through `DWObject.Addon.*` and run in the service. With the `dwt` npm package they are already inside `dynamsoft.webtwain.min.js` / `.mjs`; with the official installer, add the matching script from `Resources/addon/` (e.g. `dynamsoft.webtwain.addon.pdf.js`). Each needs the matching module in the licence.

### Barcode Reader (`Addon.BarcodeReader`)

Decode barcodes on pages already in the buffer — typical for barcode-separated batches and form routing. Windows since v14.1, macOS and Linux since v19.0.

```js
const reader = DWObject.Addon.BarcodeReader;
const settings = await reader.getRuntimeSettings("balance");   // "speed" | "balance" | "coverage"
settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_ONED;
await reader.updateRuntimeSettings(settings);

for (let i = 0; i < DWObject.HowManyImagesInBuffer; i++) {
  const results = await reader.decode(i);                      // TextResult[]: barcodeText, barcodeFormatString, localizationResult
  // start a new document whenever a separator barcode is found
}
```

Also `resetRuntimeSettings()` and `initRuntimeSettingsWithString(json)`. Reference: https://www.dynamsoft.com/web-twain/docs/info/api/Addon_BarcodeReader.html

### PDF Rasterizer (`Addon.PDF`)

Loads existing PDFs into the buffer as images. Configure it with `SetReaderOptions({ convertMode, password, renderOptions })` (the separate `SetConvertMode` / `SetResolution` / `SetPassword` calls are deprecated since 18.4); `IsTextBasedPDF(path)` and `IsRasterizationRequired(path)` decide whether rasterizing is needed. `Addon.PDF.Write.Setup(settings)` configures PDF output (`author`, `title`, `compression`, `pageType`, `quality`, `pdfaVersion`, …).

### OCR (`Addon.OCRConnector`)

On-device OCR through the service; nothing is uploaded. Pick the engine per call:

| Engine | Platform | Install |
| --- | --- | --- |
| `Windows.Media.Ocr` | Windows 10+ | Built in; add missing languages through Windows language packs |
| `Apple.Vision` | macOS 10.15+ | Built in |
| `Onnx.Ocr` | Windows 10+ | Download [`DynamicWebTWAINOCRPack.zip`](https://download2.dynamsoft.com/dwt/DynamicWebTWAINOCRPack.zip), unzip, run `Install.cmd` as administrator (copies into the service's `ocr` folder) |

```js
const ocr = DWObject.Addon.OCRConnector;
const info = await ocr.GetInstalledOCRInfo();                 // info.engines[]: { name, languages[] }
const result = await ocr.Recognize(index, {
  engine: { name: "Windows.Media.Ocr" },
  settings: { language: "en" }
});                                                           // result.blocks[].lines[].value / words[]
await ocr.SaveToPath(DWObject.SelectAllImages(),
  Dynamsoft.DWT.EnumDWT_OCRConnectorOutputFormat.PDF_WITH_EXTRA_TEXTLAYER, "output.pdf");  // searchable PDF
```

- `DetectPageOrientation(index, { engine: { name: "Onnx.Ocr" } })` returns `{ angle }`; it needs `Onnx.Ocr`.
- `SaveAsBlob(indices, format)` returns the same output as a `Blob`. For PDF/A, call `DWObject.Addon.PDF.Write.Setup({ pdfaVersion: "pdf/a-3b" })` before saving.
- With the official installer, include `Resources/addon/dynamsoft.webtwain.addon.ocrconnector.js`.
- Licensing: included in trial keys and in Core Module licences from v19.5; earlier purchased licences need an upgrade.
- Reloading a saved searchable PDF needs the PDF Rasterizer licence.

The add-on was introduced in v19.3 as `Addon.OCRKit` and renamed `Addon.OCRConnector` in v19.5; code written against `OCRKit` must be renamed. Guide: https://www.dynamsoft.com/web-twain/docs/extended-usage/ocr.html · API: https://www.dynamsoft.com/web-twain/docs/info/api/Addon_OCR.html

## Good default answer behavior

When generating DWT code, include:

1. Setup style: npm (self-hosted), CDN prototype, or official installer.
2. License placeholder.
3. Resource path note.
4. Scanner selection and `AcquireImageAsync` example.
5. Upload/save example only if requested.
6. Service installation note for end users.
