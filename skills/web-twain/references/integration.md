# Dynamic Web TWAIN (DWT)

Use DWT for browser-based document scanning and image acquisition from scanners and capture devices. It is appropriate for TWAIN/SANE/ICA/WIA/eSCL scanner control, scan-to-PDF/TIFF workflows, image buffer operations, upload, and browser scanner integration.

Official docs: https://www.dynamsoft.com/web-twain/docs/
Official samples: https://github.com/Dynamsoft/web-twain-samples
Additional sample index: `references/samples.md`

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

- CDN prototype: use CDN script and `Dynamsoft.DWT.Load()`.
- Local resources / intranet / production: host DWT Resources locally and load `dynamsoft.webtwain.initiate.js` plus `dynamsoft.webtwain.config.js`.
- npm / framework app: install `dwt`, copy static resources from `node_modules/dwt/dist` to the app public folder, set `ResourcesPath`, then call `Load()`.

## Core concepts

- `Dynamsoft.DWT.ProductKey`: license placeholder.
- `Dynamsoft.DWT.ResourcesPath`: path to static DWT resources.
- `Dynamsoft.DWT.Containers`: viewer/container configuration.
- `Dynamsoft.DWT.Load()`: initialize DWT.
- `OnWebTwainReady`: event fired when an instance can be retrieved.
- `Dynamsoft.DWT.GetWebTwain(containerIdOrWebTwainId)`: get the `WebTwain` object.
- `SelectSourceAsync()` / `SelectDeviceAsync(...)`: select scanner or device.
- `AcquireImageAsync({...})`: scan/acquire image.
- Buffer operations use `HowManyImagesInBuffer`, `CurrentImageIndexInBuffer`, and page indexes.
- Upload/save operations depend on image type enums such as PNG/PDF/TIFF and upload format enums.

## Minimal browser scanning pattern

Install and self-host the runtime (done once at build time; the page then loads it from your own origin):

```bash
npm install dwt
mkdir -p public/dwt-resources
cp -r node_modules/dwt/dist public/dwt-resources/   # keep the src/ subdirectory!
```

```html
<script src="./dwt-resources/dynamsoft.webtwain.min.js"></script>
<div id="dwtcontrolContainer"></div>
<button onclick="scan()">Scan</button>
<script>
  Dynamsoft.DWT.ProductKey = "YOUR-PRODUCT-KEY";
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

## React pattern

- Initialize once in `useEffect`.
- Store the WebTwain object in `useRef`.
- Call `Unload()` or SDK cleanup when unmounting if an instance exists.
- Copy `node_modules/dwt/dist` into `public/dwt-resources` or equivalent.
- Set `ResourcesPath` to the served public URL, not the source filesystem path.

## Common DWT pitfalls

- `ResourcesPath` points to a filesystem path instead of a served URL.
- CDN script is loaded but service installer path or resources are misconfigured.
- Local `dynamsoft.webtwain.config.js` already sets config; duplicate page-level config causes confusion.
- Scanner service is not installed/running.
- Browser security or OS permissions block scanner/camera access.
- The scanner UI is hidden with `IfShowUI: false` but the device requires vendor UI for some settings.
- Index operations use zero-based image indexes.
- **`GetImageURL()` returns URLs tied to the internal buffer — they become invalid after `RemoveAllImages()`.** Use `ConvertToBlob()` instead when you need images to persist beyond buffer operations (see "Extracting images without the DWT viewer" below).
- **`ResourcesPath` directory structure must mirror `node_modules/dwt/dist/`.** The DWT runtime dynamically loads files from `<ResourcesPath>/src/dynamsoft.webtwain.css`, `<ResourcesPath>/src/dynamsoft.webtwain.viewer.js`, etc. Simply copying all files flat into the resources directory causes 404s. You must preserve the `src/` subdirectory: copy both `dynamsoft.webtwain.min.js` (root) and the entire `src/` folder (with its contents) from `node_modules/dwt/dist/` into your public resources path.

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

## OCR (OCRKit addon)

DWT provides on-device OCR via the OCRKit addon. OCR requires two components:

1. **JS addon script**: `dynamsoft.webtwain.addon.ocrkit.js` — it ships in the `dwt` npm package at `node_modules/dwt/dist/dynamsoft.webtwain.addon.ocrkit.js`; copy it into your self-hosted resources path alongside the rest of `dist/`.
2. **OCR runtime package**: Download the official OCR Runtime Package (`DynamicWebTWAINOCRResources.zip`) from the DWT OCR docs page (https://www.dynamsoft.com/web-twain/docs/info/api/Addon_OCR.html, section "Install OCR Runtime Package"), then unzip and run `Install.cmd` as administrator to copy runtime files into the DWT Service installation folder.

Key API methods on `DWTObject.Addon.OCRKit`:
- `GetInstalledOCRInfo()` — check if OCR runtime is installed.
- `Recognize(index, {settings: {language: 'en'}})` — OCR a single page.
- `SaveToPath(indices, Dynamsoft.DWT.EnumDWT_OCRKitOutputFormat.PDF_WITH_EXTRA_TEXTLAYER, path)` — save as searchable PDF.
- `DetectPageOrientation(index)` — detect page rotation angle.
- `SaveAsBlob(indices, format)` — save OCR result as blob.

OCR reference: https://www.dynamsoft.com/web-twain/docs/info/api/Addon_OCR.html

## Good default answer behavior

When generating DWT code, include:

1. Setup style: CDN, local resources, or npm.
2. License placeholder.
3. Resource path note.
4. Scanner selection and `AcquireImageAsync` example.
5. Upload/save example only if requested.
6. Service installation note for end users.
