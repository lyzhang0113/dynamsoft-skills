# Dynamsoft Document Viewer (DDV)

Use DDV for web document viewing, page navigation, viewing images/PDFs, annotation workflows, document editing operations, and viewer UI integration. DDV is not a scanner SDK by itself. For scanner acquisition, combine with DWT or a capture/upload pipeline.

Official docs: https://www.dynamsoft.com/document-viewer/docs/
Official sample repo: https://github.com/Dynamsoft/document-viewer-samples
Additional sample index: `references/samples.md`

License for generated examples in this repository: use the `YOUR_LICENSE_KEY` placeholder (or an environment variable) â€” never a real key.

Need a trial license? Apply here:
https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform

## Sample-first links

- DDV samples: https://github.com/Dynamsoft/document-viewer-samples
- DDV docs: https://www.dynamsoft.com/document-viewer/docs/

When generating DDV code, first map the request to a sample workflow: viewer creation, file loading, page operations, annotation, export, or integration with DWT/DCV.

## Product boundary

- Use DDV when the user wants to display, view, edit, annotate, or manage document pages in a browser UI.
- Use DWT when the user wants to control physical scanners in the browser.
- Use DBR/DCV when the user wants recognition/extraction from images or video.

## Core answer pattern

For DDV integration, provide:

1. Install/import instructions.
2. License initialization with the `YOUR_LICENSE_KEY` placeholder (the user substitutes their real key themselves).
3. Resource/static asset path configuration if required by the version.
4. Viewer/container creation.
5. Loading a file/blob/image/PDF.
6. Cleanup when component/page is destroyed.

## Web framework guidance

- For React/Vue/Angular, initialize the viewer after the DOM container exists.
- Keep viewer instances in refs/component fields, not in repeatedly recreated local variables.
- Destroy/cleanup the viewer on unmount.
- Serve static resources from a public path and verify network requests for missing files.

## Common workflows

- Load local files into viewer.
- Display PDFs and images.
- Reorder, rotate, delete, or manage pages.
- Export or save the resulting document.
- Add or manage annotations if the installed DDV edition/version supports it.
- Combine with DWT: scan with DWT, pass image/PDF output into DDV for viewing and page operations.

## Common pitfalls

- Confusing DDV with DWT: DDV views/manages documents; DWT controls scanners.
- Missing resource files after bundling. When DDV is built through a bundler (Vite/webpack/Rollup/Next.js) it cannot infer its own script URL, so the `.wasm`/worker assets are requested from the app origin and the server returns `index.html` instead â€” surfacing as `Uncaught SyntaxError: Unexpected token '<'`. Set the engine resource path explicitly before `Core.init()`, e.g. `Dynamsoft.DDV.Core.engineResourcePath = "./dynamsoft-document-viewer/dist/engine"` â€” copy the installed `dynamsoft-document-viewer` package's `dist/engine` folder next to your app and serve it from your own origin (never a runtime CDN). See the analogous `CoreModule.engineResourcePaths.rootDirectory` note in `the `capture-vision-web` skill` for the same root cause in DCV.
- Creating the viewer before the container DOM node exists.
- Forgetting cleanup in SPA route changes.
- Assuming all annotation/page APIs exist across every major version; verify exact APIs if the version is not provided.

## Safe code-generation guidance

If exact class or method names are not known for the target version, generate a clearly marked skeleton and ask the user to verify the initialization and load method names in the official DDV docs. Do not invent detailed DDV API calls beyond known version context.
