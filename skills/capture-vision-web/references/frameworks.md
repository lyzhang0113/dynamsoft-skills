# React hooks scanner pattern

The pattern below survives `StrictMode` double-mounting, keeps one router per component instance,
and disposes everything on unmount.

```tsx
import { useEffect, useRef, useState } from "react";
import {
  CoreModule,
  LicenseManager,
  CaptureVisionRouter,
  CameraEnhancer,
  CameraView
} from "dynamsoft-barcode-reader-bundle";
```

## Asset root (required when bundled)

Set this once, at module scope, before any component mounts and before `initLicense`:

```tsx
// The property is rootDirectory, not root.
CoreModule.engineResourcePaths.rootDirectory = "/dynamsoft/";
```

Serve the assets from the app origin under the layout the SDK builds
(`/dynamsoft/<package>@<version>/dist/…`):

```bash
mkdir -p public/dynamsoft/dynamsoft-barcode-reader-bundle@11.6.5000
cp -r node_modules/dynamsoft-barcode-reader-bundle/dist \
      public/dynamsoft/dynamsoft-barcode-reader-bundle@11.6.5000/
```

## Component

```tsx
interface ScannerProps {
  licenseKey: string;                       // from config, never a literal
  onResultsFound: (texts: string[]) => void;
}

export function BarcodeScanner({ licenseKey, onResultsFound }: ScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<CameraView | null>(null);
  const enhancerRef = useRef<CameraEnhancer | null>(null);
  const routerRef = useRef<CaptureVisionRouter | null>(null);
  const startingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function start() {
      if (startingRef.current) return;     // StrictMode mounts twice in dev
      startingRef.current = true;
      try {
        await LicenseManager.initLicense(licenseKey);
        if (!active || !containerRef.current) return;

        const view = await CameraView.createInstance();
        if (!active) { view.dispose(); return; }
        viewRef.current = view;
        containerRef.current.appendChild(view.getUIElement());

        const enhancer = await CameraEnhancer.createInstance(view);
        if (!active) { enhancer.dispose(); return; }
        enhancerRef.current = enhancer;

        const router = await CaptureVisionRouter.createInstance();
        if (!active) { router.dispose(); return; }
        routerRef.current = router;

        router.setInput(enhancer);
        router.addResultReceiver({
          onDecodedBarcodesReceived: (result) => {
            const items = result.barcodeResultItems ?? [];
            if (items.length > 0) onResultsFound(items.map((item) => item.text));
          }
        });

        await enhancer.open();
        await router.startCapturing("ReadBarcodes_Default");
      } catch (error) {
        console.error("Scanner init failed:", error);
      } finally {
        startingRef.current = false;
      }
    }

    start();

    return () => {
      active = false;
      routerRef.current?.dispose();
      enhancerRef.current?.dispose();
      viewRef.current?.dispose();
      routerRef.current = enhancerRef.current = viewRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [licenseKey, onResultsFound]);

  return <div ref={containerRef} style={{ width: "100%", height: 480 }} />;
}
```

## Notes

- The camera stream is released by `enhancer.dispose()`; skipping it leaves the device light on after
  navigation.
- `onResultsFound` usually comes from props and changes identity every render. Wrap it in
  `useCallback` in the parent, or the effect tears down and restarts the scanner on every render.
- Initialize the license once per app (a module-level `await` or a provider), not once per mounted
  component, if several scanners can exist at the same time. `initLicense` is idempotent but the
  extra calls still cost startup time.
- Vue and Angular follow the same lifecycle: create on mount, dispose on unmount, and never inside
  a watcher that can fire repeatedly.
