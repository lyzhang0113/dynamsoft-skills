---
name: document-viewer
description: View, annotate, reorder and export PDFs and images in a browser with Dynamsoft Document Viewer. Covers Core licensing and init, the viewer/editViewer split, page and annotation operations, saving back to PDF, and pairing with Web TWAIN for a scan-to-edit flow.
---

# Dynamsoft Document Viewer (DDV)

Use this skill when the task is a **document UI in the browser**: render PDFs and images, page
through them, annotate, rotate, reorder, delete, and export. DDV does not acquire images â€” for a
physical scanner use `web-twain`; for camera capture use `capture-vision-web`.

Read `references/integration.md` for the full API reference: viewer types, annotation tools, page
operations and export options.

## Install

```bash
npm install dynamsoft-document-viewer@5.0.1
```

Copy the `dist` assets (including the engine worker/wasm files) into the app's static directory, and
serve them from the app origin.

## License

DDV is licensed through `Core`, not through `LicenseManager`:

1. `get_trial_license` with `product: "ddv"`, `package: "web"`.
2. `status: "login_required"` â€” a browser window opened; ask the user to finish the sign-in and call
   again.
3. Keep the key in configuration, show only `licenseKeyMasked`, and assign it before `init()`.

```js
import Dynamsoft from "dynamsoft-document-viewer";

Dynamsoft.DDV.Core.license = window.DYNAMSOFT_LICENSE_KEY;   // never a literal
await Dynamsoft.DDV.Core.init();
```

The order is fixed: set `Core.license` **then** await `Core.init()`. Calling into a viewer before
`init()` resolves throws.

## Viewer vs editViewer

| Component | Use for |
| --- | --- |
| `Dynamsoft.DDV.viewer` | Read-only presentation: page navigation, zoom, search |
| `Dynamsoft.DDV.editViewer` | Editing: annotations, page delete/rotate/reorder, forms |

```js
const viewer = new Dynamsoft.DDV.EditViewer({
  container: document.getElementById("viewer"),
  group: "doc-group",
  uiConfig: Dynamsoft.DDV.UIConfig.default
});

const doc = Dynamsoft.DDV.documentManager.createDocument({ name: "scan", author: "app" });
await doc.load("https://example.com/input.pdf");
```

A `Document` belongs to a `documentManager` group; viewers render a group. Create the document once
and attach it to the viewer rather than reloading the file per view.

## Page and annotation operations

- Pages: `doc.getPages()`, `doc.insertPage()`, `doc.deletePages([...])`, `doc.movePages([...])`,
  `doc.rotatePages([...], 90)`.
- Annotations: `doc.getAnnotations()`, add through the edit viewer's annotation UI config, then
  `doc.saveAnnotations()`.
- Export: `doc.saveToPdf({ saveAnnotation: true })`, or per-page images.

Indexes shift after a delete. Re-read the page list after any structural change instead of reusing
cached indexes.

## Scan â†’ view â†’ export

The common production flow pairs DWT and DDV:

1. DWT acquires pages into its buffer.
2. Each page is uploaded or converted to a blob.
3. DDV loads the blobs as a document for review and annotation.
4. DDV exports the final PDF.

Both SDKs take a license key: DWT assigns it to `Dynamsoft.DWT.ProductKey`, DDV to `Dynamsoft.DDV.Core.license`, and each must be set before its `init()` / `Load()` call. The same key covers both, and the edition must match the runtime.

## Pitfalls

1. **`Core.init()` before any viewer** â€” constructing a viewer first is the most common crash.
2. **Assets** â€” DDV loads wasm workers; a missing `dist/engine` directory produces a blank viewer
   with console 404s rather than a visible error.
3. **PDF rendering needs the worker** â€” if the page count renders but pages are blank, check the
   worker/wasm requests first.
4. **Dispose documents and viewers** on route change; otherwise the second visit to the page shows
   the previous document's state.
5. **Licence scope** â€” DDV and Capture Vision are different products with different keys; a DCV key
   does not license DDV.

## Samples

- Document Viewer samples: https://github.com/Dynamsoft/document-viewer-samples
- Scan + view management app:
  https://github.com/yushulx/web-twain-document-scan-management
- Docs: https://www.dynamsoft.com/document-viewer/docs/
