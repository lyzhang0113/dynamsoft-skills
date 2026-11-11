---
name: web-twain
description: Control TWAIN, SANE, WIA, ICA and eSCL scanners from a browser with Dynamic Web TWAIN. Use when a web app must scan from physical scanners or ADFs, build scan-to-PDF/TIFF or scan-and-upload flows, pick a scanner in its own UI, embed DWT in React/Angular/Vue, call the DWT REST service from .NET, or fix service-not-installed, HTTPS/local-network and ProductKey errors.
---

# Dynamic Web TWAIN (DWT)

Use this skill when the browser must drive **physical scanner hardware** — flatbeds, ADFs, network
scanners — rather than a camera. DWT acquires images; it is not a barcode SDK and not a viewer.

Read `references/integration.md` for the full reference: global config, acquisition options,
framework lifecycles, add-ons (barcode, PDF rasterizer, OCR) and the image-extraction pattern.

Route elsewhere when:

| Need | Use |
| --- | --- |
| Camera capture on a phone or webcam | `capture-vision-web` / `capture-vision-mobile` |
| Barcode decoding without a scanner | `capture-vision-web` / `capture-vision-desktop` |
| View, annotate or edit PDFs without scanning | `document-viewer` (pair it with DWT for scan → edit) |
| A WPF/WinForms app scanning on its own machine | the community [`Twain.Wia.Sane.Scanner`](https://www.nuget.org/packages/Twain.Wia.Sane.Scanner/) package, the successor to Dynamic .NET TWAIN |

## Ways to use it

DWT is a licensed runtime plus a local **service** (Windows/macOS/Linux) that owns the scanner
connection. How your code talks to that service is a real design choice:

| Mode | Your code runs in | You use |
| --- | --- | --- |
| **JavaScript SDK** | The browser | `dwt` npm package or script tag; the SDK talks to the service over a local connection |
| **REST API** | A .NET/desktop/server app, or a backend acting for a client | The service's HTTP endpoints, wrapped by `DynamicWebTWAIN.RESTClient` in .NET |
| **Embedded service** | Your own installer/app | `DynamicWebTWAIN.Service` package, so users need not install DWT separately |

Pick the JavaScript SDK when there is a browser page with UI. Pick REST when the caller is not a
browser (a WPF/console app, a document service, or a web backend that scans on behalf of a client).
Both talk to the same service, so the scanner protocols (TWAIN 32/64-bit, WIA, SANE, ICA, eSCL) and
the licence are shared.

## Install

Browser SDK — self-host the runtime from your own origin:

```bash
npm install dwt
mkdir -p public/dwt-resources
cp -r node_modules/dwt/dist/. public/dwt-resources/   # copies the contents of dist, src/ included
```

The trailing `/.` matters: `cp -r node_modules/dwt/dist public/dwt-resources/` into an existing
directory produces `dwt-resources/dist/…`, and the page's script tag then returns 404.

For a throwaway prototype a CDN works, but use UNPKG (jsDelivr's file-size limit blocks the service
installers) and pin the **same** version in the script URL and `ResourcesPath`:
`https://unpkg.com/dwt@19.5.0/dist/`. Licences are tied to a major version, so pin `dwt@^19` in
`package.json` rather than upgrading majors silently.

REST client (.NET):

```bash
dotnet add package DynamicWebTWAIN.RESTClient
dotnet add package DynamicWebTWAIN.Service          # optional: embed the service
dotnet add package DynamicWebTWAIN.ServiceFinder    # optional: locate a service on the LAN
```

## License

DWT reads its key from `Dynamsoft.DWT.ProductKey` and checks it before `Load()` completes.

1. `get_trial_license` with `product: "dwt"` and `package: "web"` (or `cross-platform`); use
   `product: "dwt-ddv"` when the app also uses Document Viewer.
2. `status: "login_required"` means a browser window opened: ask the user to finish the sign-in and
   call again.
3. Put the key in configuration and assign it to `Dynamsoft.DWT.ProductKey`; show only
   `licenseKeyMasked` in chat. In code, keep the placeholder:
   `Dynamsoft.DWT.ProductKey = window.DYNAMSOFT_LICENSE_KEY;`
4. The same key must also be set in the DWT service configuration on the host — a correct browser
   key with an unlicensed service fails at scan time, not at load time.

The key is scoped by **edition**: a `desktop` key is rejected by a browser runtime with
`License mismatch: Browser requested`. Formats you will meet: trial keys start with `t0`, online
production keys with `DLS2`, offline production keys with `f0` (several offline keys are joined
with `;`).

## Minimal scan flow

```html
<script src="./dwt-resources/dynamsoft.webtwain.min.js"></script>
<div id="dwtcontrolContainer"></div>
<button id="scan">Scan</button>

<script>
  Dynamsoft.DWT.AutoLoad = false;                       // we call Load() ourselves
  Dynamsoft.DWT.ProductKey = window.DYNAMSOFT_LICENSE_KEY;
  Dynamsoft.DWT.ResourcesPath = "./dwt-resources";
  Dynamsoft.DWT.Containers = [{ ContainerId: "dwtcontrolContainer", Width: "360px", Height: "480px" }];

  Dynamsoft.DWT.RegisterEvent("OnWebTwainReady", () => {
    const DWObject = Dynamsoft.DWT.GetWebTwain("dwtcontrolContainer");

    document.getElementById("scan").onclick = async () => {
      try {
        await DWObject.SelectSourceAsync();             // shows the source list and opens the choice
        await DWObject.AcquireImageAsync({
          IfShowUI: false,
          IfCloseSourceAfterAcquire: true,
          Resolution: 200,
          PixelType: Dynamsoft.DWT.EnumDWT_PixelType.TWPT_GRAY
        });
      } catch (e) {
        console.error("Scan failed:", e.message || e); // cancelled dialog, jam, unplugged device
      }
    };
  });

  Dynamsoft.DWT.Load();
</script>
```

Then `DWObject.SaveAsPDF("scan.pdf", index)`, `SaveAsJPEG(...)`, `HTTPUpload(...)` or
`ConvertToBlob(...)` to move the result.

## Scanner picker in your own UI

`SelectSourceAsync()` shows DWT's dialog. For a dropdown inside your app, list devices yourself:

```js
const devices = await DWObject.GetDevicesAsync();                 // Device[]: displayName, deviceType…
// or filter: GetDevicesAsync(Dynamsoft.DWT.EnumDWT_DeviceType.TWAINSCANNER | Dynamsoft.DWT.EnumDWT_DeviceType.ESCLSCANNER)
await DWObject.SelectDeviceAsync(devices[chosenIndex]);
await DWObject.AcquireImageAsync({ IfShowUI: false, IfCloseSourceAfterAcquire: true });
```

Device types: `TWAINSCANNER`, `TWAINX64SCANNER`, `WIASCANNER`, `ICASCANNER`, `SANESCANNER`,
`ESCLSCANNER`, `WIFIDIRECTSCANNER`.

## Save and upload

- `HTTPUpload(url, indices, EnumDWT_ImageType.IT_PDF, EnumDWT_UploadDataFormat.Binary, "scan.pdf", onEmptyResponse, onServerReturnedSomething)`:
  the **first** callback fires when the server answers with an empty body (normally success); the
  second fires whenever the server returns content, which is often an error message. The form field
  defaults to `RemoteFile` (`HttpFieldNameOfUploadedImage` changes it).
- When the app already uses `fetch` (auth headers, JSON responses), convert and post yourself:

```js
DWObject.ConvertToBlob(
  [...Array(DWObject.HowManyImagesInBuffer).keys()],
  Dynamsoft.DWT.EnumDWT_ImageType.IT_PDF,
  (blob) => {
    const form = new FormData();
    form.append("RemoteFile", blob, "scan.pdf");
    fetch("/upload", { method: "POST", body: form });
  },
  (code, message) => console.error(message)
);
```

## REST mode

Use REST when the code that decides *what to scan* is not a browser. The service exposes HTTP
endpoints; `.NET` callers use the `DynamicWebTWAIN.RESTClient` wrapper rather than hand-rolling
requests, because the endpoint shape follows the service version.

| Package | Role |
| --- | --- |
| `DynamicWebTWAIN.RESTClient` | .NET wrapper over the service REST API |
| `DynamicWebTWAIN.Service` | Embed the service in your app, no separate installer |
| `DynamicWebTWAIN.ServiceFinder` | Find running DWT services on the local network |
| `DocumentViewer.JSInterop` | Show pages in a WebView using Dynamsoft Document Viewer (needs a DDV licence too) |

Flow: locate the service (local or `ServiceFinder`) → select source → acquire → pull the image →
save or upload. The same license key covers it; the service needs the key configured on the host.

Requirements: .NET Standard 2.0+ or .NET Framework 4.6.1+, a DWT licence, and — only if you display
pages through `DocumentViewer.JSInterop` — a Document Viewer licence as well. `product: "dwt-ddv"` in
`get_trial_license` issues a key for the pair.

Calling the REST endpoints from a **browser** origin is subject to CORS on the service; when that is
the situation, prefer the JavaScript SDK, which is designed for it.

Docs: https://www.dynamsoft.com/web-twain/docs/extended-usage/restful-api.html

## Buffer model

`DWObject.HowManyImagesInBuffer` and `CurrentImageIndexInBuffer` are the two values almost every
generated snippet forgets. Page operations use a zero-based index: rotate, crop, delete, reorder.
After a delete, re-check the count before using a saved index.

## Deployment

Every end-user machine needs the **Dynamic Web TWAIN Service**. Plan for it before the first demo:

- **Installers** — `DynamicWebTWAINServiceSetup.msi`/`.pkg`/`.deb`/`.rpm` ship in the package's
  `dist/dist/` folder, i.e. `dwt-resources/dist/` after the copy above. When you host them elsewhere,
  set `Dynamsoft.DWT.ServiceInstallerLocation` to that URL so users missing the service get a working
  download prompt. Serve `.wasm`, `.msi`, `.pkg`, `.deb` and `.rpm` with correct MIME types.
- **Silent install** for managed fleets: `msiexec /i DynamicWebTWAINServiceSetup.msi /qn`.
- **Ports** — the page reaches the service on `127.0.0.1` at 18622/18625 (HTTP) and 18623/18626
  (HTTPS). If the site sends a Content-Security-Policy, allow
  `wss://127.0.0.1:18623 wss://127.0.0.1:18626` in `connect-src`, and the `ResourcesPath` origin in
  `script-src`.
- **Browser network rules** — Chromium's Private Network Access (94+) blocks plain-HTTP pages from
  reaching localhost services, and Chromium 142+ adds a Local Network Access permission prompt. Serve
  the page over HTTPS (or localhost) and expect users to accept that prompt once.
- **Upgrades** — a new DWT major version may need the service updated on every client, and the
  licence follows the major version. Schedule both together.

## Pitfalls

1. **`Load()` is asynchronous** — nothing works before `OnWebTwainReady` fires. Do not call
   `GetWebTwain` at module scope.
2. **Missing service** — "The Dynamsoft Service is not installed" means the local service, not a
   JavaScript error. Point the user at the service installer rather than debugging the page.
3. **HTTPS and local network access** — see Deployment; a page on plain HTTP silently never connects
   in current Chromium.
4. **Resources path** — if `ResourcesPath` is wrong, the UI renders but scanning never starts. It
   must be a served URL whose layout mirrors `node_modules/dwt/dist/`, including `src/`.
5. **Licence edition** — a key issued for `desktop` fails in the browser with
   `License mismatch: Browser requested`. Request `web` or `cross-platform`.
6. **Instance vs global events** — `Dynamsoft.DWT.RegisterEvent` is for `OnWebTwainReady` only;
   register `OnPostAllTransfers`, `OnPostTransfer` etc. on the `DWObject` instance, or they never fire.
7. **SPA teardown** — call `Dynamsoft.DWT.Unload()` when the scanning component unmounts, and guard
   against initializing twice on re-render; otherwise the remount fails on a stale service connection.
8. **Scanner drivers** — TWAIN on Windows, SANE on Linux, ICA on macOS. A scanner that works in a
   native app may still need a 64-bit driver for the service.

## Samples

- Web TWAIN samples: https://github.com/Dynamsoft/web-twain-samples
- React advanced: https://github.com/Dynamsoft/web-twain-react-advanced
- Angular advanced: https://github.com/Dynamsoft/web-twain-angular-advanced
- Vue advanced: https://github.com/Dynamsoft/web-twain-vue-advanced
- Scan + view + manage in one app:
  https://github.com/yushulx/web-twain-document-scan-management
- API reference: https://www.dynamsoft.com/web-twain/docs/info/api/
