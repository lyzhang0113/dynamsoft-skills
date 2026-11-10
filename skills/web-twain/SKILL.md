---
name: web-twain
description: Control TWAIN, SANE, WIA, ICA and eSCL scanners from a browser with Dynamic Web TWAIN. Covers self-hosted resources, ProductKey licensing, the scan-to-PDF/TIFF flow, buffer operations, upload, and the HTTPS and service-connection requirements that block first runs.
---

# Dynamic Web TWAIN (DWT)

Use this skill when the browser must drive **physical scanner hardware** — flatbeds, ADFs, network
scanners — rather than a camera. DWT is not a barcode SDK and not a viewer; it acquires images.

Read `references/integration.md` for the full reference: loader variants, buffer operations, upload
formats and framework samples.

## Three ways to use it

DWT is a licensed runtime plus a local **service** (Windows/macOS/Linux) that owns the scanner
connection. How your code talks to that service is a real design choice:

| Mode | Your code runs in | You use |
| --- | --- | --- |
| **JavaScript SDK** | The browser | `dwt` npm package or script tag; the SDK talks to the service over a local connection |
| **REST API** | A .NET/desktop/server app, or a backend acting for a client | The service's HTTP endpoints, wrapped by `DynamicWebTWAIN.RESTClient` in .NET |
| **Embedded service** | Your own installer/app | `DynamicWebTWAIN.Service` package, so users need not install DWT separately |
| **Windows .NET desktop app** | A WPF/WinForms app that scans locally | the community [`Twain.Wia.Sane.Scanner`](https://www.nuget.org/packages/Twain.Wia.Sane.Scanner/) package — the successor to Dynamic .NET TWAIN |

Pick the JavaScript SDK when there is a browser page with UI. Pick REST when the caller is not a
browser (a WPF/console app, a document service, or a web backend that scans on behalf of a client).
Both talk to the same service, so the scanner protocols (TWAIN 32/64-bit, WIA, SANE, ICA, eSCL) and
the licence are shared.

## Install

Browser SDK:

```bash
npm install dwt
mkdir -p public/dwt-resources
cp -r node_modules/dwt/dist public/dwt-resources/    # keep the src/ subdirectory
```

REST client (.NET):

```bash
dotnet add package DynamicWebTWAIN.RESTClient
dotnet add package DynamicWebTWAIN.Service          # optional: embed the service
dotnet add package DynamicWebTWAIN.ServiceFinder    # optional: locate a service on the LAN
```

## License

DWT takes the **same Dynamsoft license key** as the other SDKs. It is assigned to
`Dynamsoft.DWT.ProductKey` — that is the property name, not a different key format.

1. `get_trial_license` with `product: "dwt"` and `package: "web"` (or `cross-platform`).
2. `status: "login_required"` means a browser window opened: ask the user to finish the sign-in and
   call again.
3. Put the key in configuration and assign it to `Dynamsoft.DWT.ProductKey`; show only
   `licenseKeyMasked` in chat.
4. The same key must also be set in the DWT service configuration on the host — a correct browser
   key with an unlicensed service fails at scan time, not at load time.

The key is scoped by **edition**, not by product: a `desktop` key is rejected by a browser runtime
with `License mismatch: Browser requested`, while a `web` or `cross-platform` key also licenses the
other Dynamsoft products.

In code, keep the placeholder: `Dynamsoft.DWT.ProductKey = window.DYNAMSOFT_LICENSE_KEY;`

## Minimal scan flow

```html
<script src="./dwt-resources/dynamsoft.webtwain.min.js"></script>
<div id="dwtcontrolContainer"></div>
<button id="scan">Scan</button>

<script>
  Dynamsoft.DWT.ProductKey = window.DYNAMSOFT_PRODUCT_KEY;
  Dynamsoft.DWT.ResourcesPath = "./dwt-resources";
  Dynamsoft.DWT.Containers = [{ ContainerId: "dwtcontrolContainer", Width: "360px", Height: "480px" }];

  Dynamsoft.DWT.RegisterEvent("OnWebTwainReady", () => {
    const DWObject = Dynamsoft.DWT.GetWebTwain("dwtcontrolContainer");

    document.getElementById("scan").onclick = async () => {
      if (DWObject.SelectSource()) {
        await new Promise((resolve) =>
          DWObject.OpenSourceAsync ? DWObject.OpenSourceAsync().then(resolve) : DWObject.OpenSource()
        );
        await DWObject.AcquireImageAsync({
          IfCloseSourceAfterAcquire: true,
          IfShowUI: false
        });
      }
    };
  });

  Dynamsoft.DWT.Load();
</script>
```

Then `DWObject.SaveAsPDF("scan.pdf")`, `SaveAsJPEG(...)`, or `HTTPUpload(...)` to move the result.

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
pages through `DocumentViewer.JSInterop` — a Document Viewer licence as well. `product: "dwtddv"` in
`get_trial_license` issues a key for the pair.

Calling the REST endpoints from a **browser** origin is subject to CORS on the service; when that is
the situation, prefer the JavaScript SDK, which is designed for it.

Docs: https://www.dynamsoft.com/web-twain/docs/extended-usage/restful-api.html

## Buffer model

`DWObject.HowManyImagesInBuffer` and `CurrentImageIndexInBuffer` are the two values almost every
generated snippet forgets. Page operations use an index: rotate, crop, delete, reorder. After a
delete, re-check the count before using a saved index.

## Pitfalls

1. **`Load()` is asynchronous** — nothing works before `OnWebTwainReady` fires. Do not call
   `GetWebTwain` at module scope.
2. **Missing service** — "The Dynamsoft Service is not installed" means the local service, not a
   JavaScript error. Point the user at the service installer rather than debugging the page.
3. **HTTPS** — the page must be served over HTTPS (or localhost) for the local service connection to
   be allowed by the browser.
4. **Resources path** — if `ResourcesPath` is wrong, the UI renders but scanning never starts. Copy
   the whole `dist` directory, including `src/`.
5. **Licence edition** — a key issued for `desktop` fails in the browser with
   `License mismatch: Browser requested`. Request `web` or `cross-platform`.
6. **Scanner drivers** — TWAIN on Windows, SANE on Linux, ICA on macOS. A scanner that works in a
   native app may still need a 64-bit driver for the service.

## Samples

- Web TWAIN samples: https://github.com/Dynamsoft/web-twain-samples
- React advanced: https://github.com/Dynamsoft/web-twain-react-advanced
- Angular advanced: https://github.com/Dynamsoft/web-twain-angular-advanced
- Vue advanced: https://github.com/Dynamsoft/web-twain-vue-advanced
- Scan + view + manage in one app:
  https://github.com/yushulx/web-twain-document-scan-management
