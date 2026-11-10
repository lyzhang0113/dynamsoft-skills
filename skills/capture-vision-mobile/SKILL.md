---
name: capture-vision-mobile
description: Dynamsoft SDKs in mobile apps. Covers barcode and QR scanning, MRZ passport and ID reading, document detection and normalization on Android, iOS, Flutter, React Native, .NET MAUI and Swift Package Manager, with licensing, camera permissions, lifecycle and the CaptureVisionRouter pipeline.
---

# Capture Vision on mobile

Same router, same templates as web and desktop. The capability is a template string; the platform
decides which package you install and who owns the camera.

| Capability | Template |
| --- | --- |
| Barcodes / QR | `ReadBarcodes_Default`, `ReadSingleBarcode`, `ReadBarcodes_SpeedFirst`, `ReadBarcodes_ReadRateFirst` |
| Document boundaries | `DetectDocumentBoundaries_Default` |
| Boundaries + normalization | `DetectAndNormalizeDocument_Default` |
| MRZ | `ReadPassportAndId` (`ReadPassport`, `ReadId`) |
| Text lines / labels | `RecognizeTextLines_Default` |

## Platforms and packages

| Platform | Artifact |
| --- | --- |
| Android (Kotlin/Java) | `com.dynamsoft:barcodereader` 11.6.4000, or `com.dynamsoft:capturevision` 3.6.4000 |
| iOS (Swift/Obj-C) | SPM: `barcode-reader-spm`, `capture-vision-spm` (+ `document-normalizer-spm`, `label-recognizer-spm`, `code-parser-spm`, `mrz-scanner-spm`) |
| Flutter | `flutter_barcode_sdk`, Capture Vision Flutter packages, `mrz-scanner-mobile-flutter` |
| React Native | Capture Vision RN package, `mrz-scanner-mobile-react-native` |
| .NET MAUI | `Dynamsoft.DotNet.BarcodeReader.Bundle`, `mrz-scanner-mobile-maui` |

Take the barcode-only package when the app only scans barcodes; take Capture Vision the moment the
same camera session also reads MRZ, documents or labels.

Ready-made scan screens exist per capability — `BarcodeScanner`, `DocumentScanner`, `MRZScanner`.
They are RTU components: a preset UI and preset pipeline, little control over ROI, templates,
multi-barcode selection or result handling. Use them for a demo only. **A custom UX or workflow belongs on the Capture Vision native
interfaces** (`CaptureVisionRouter` + templates), not on these components.

## License

1. `get_trial_license` with the product (`dcv` / `dbr` / `mrz`) and `package: "mobile"`.
2. `status: "login_required"` means a browser window opened — ask the user to finish the Google
   sign-in, then call again; the session is reused.
3. Store the key in a build config, never a source literal: Android `BuildConfig` fed from an
   uncommitted `gradle.properties`, iOS xcconfig or plist, Flutter/RN a secrets file. Show only
   `licenseKeyMasked` in chat.
4. `get_license_guide` with `platform: "android"` (or `ios`, `flutter`, `react-native`, `maui`)
   returns the init call.

```kotlin
// Android, Kotlin — Application.onCreate
LicenseManager.initLicense(BuildConfig.DYNAMSOFT_LICENSE_KEY) { isSuccess, error ->
    if (!isSuccess) Log.e("Dynamsoft", "license failed: ${error.message}")
}
```

```swift
// iOS, Swift — app init
LicenseManager.initLicense(AppConfig.licenseKey, verificationDelegate: nil)
```

Initialise once, before the first router. A router created before licensing fails in ways that look
like decode errors.

## Camera pipeline

Build these in order, once per screen:

1. `CameraView` — preview surface added to the layout.
2. `CameraEnhancer` — owns the camera session, bound to the view.
3. `CaptureVisionRouter` — set the enhancer as input, attach a result receiver, start with a template.

```kotlin
// Android, Kotlin
private val cameraView = CameraView(this)
private val cameraEnhancer = CameraEnhancer(cameraView)
private val router = CaptureVisionRouter()

router.setInput(cameraEnhancer)
router.addResultReceiver(object : CapturedResultReceiver() {
    override fun onDecodedBarcodesReceived(result: DecodedBarcodesResult) {
        for (item in result.items) Log.i("Dynamsoft", "${item.formatString}: ${item.text}")
    }
})
router.startCapturing("ReadBarcodes_Default", null)
```

```swift
// iOS, Swift
private let cameraView = CameraView()
private let cvr = CaptureVisionRouter()

cvr.setInput(cameraView)
cvr.addResultReceiver(self)              // conform to CapturedResultReceiver
cvr.startCapturing("ReadBarcodes_Default", nil)
```

On a phone, `ReadBarcodes_SpeedFirst` is usually the better default for a live viewfinder.

## Per capability

**Barcode / QR** — the pipeline above; switch templates for speed vs read rate, or use a custom
template to restrict symbologies.

**MRZ** — same pipeline with `ReadPassportAndId`. Read fields by name from the parsed item
(`documentNumber`, `dateOfBirth`, `dateOfExpiry`, …) instead of parsing the raw zone yourself. On
mobile the MRZ templates come from the bundled `mrz-mobile.json` template loaded with
`initSettingsFromFile(...)`. The MRZ Scanner mobile SDK is the packaged option when its built-in screen fits; a custom MRZ
UX or workflow must use these templates directly.

**Document** — run `DetectDocumentBoundaries_Default` while framing, draw the quad as an overlay, and
call `capture()` with `DetectAndNormalizeDocument_Default` on confirm. Two captures is deliberate:
normalizing every frame is expensive.

**Labels / text** — `RecognizeTextLines_Default`, combined with Code Parser for typed fields (VIN,
GS1 AI, AAMVA).

## Platform notes

`references/platforms.md` has the per-platform detail: Gradle/SPM coordinates, manifest and plist
permissions, lifecycle hooks, MAUI handlers, Flutter and React Native entry points, and the
permission matrix.

The three failures that break mobile capture most often:

1. **Missing permission** — Android needs `CAMERA` in the manifest *and* a runtime request; iOS needs
   `NSCameraUsageDescription` in `Info.plist` or the app crashes on first open.
2. **Lifecycle** — release the camera in `onPause` / `viewWillDisappear`; a backgrounded session
   returns to a black preview.
3. **Rotation** — rebuild or re-bind the view after a configuration change; a view built for the old
   surface renders nothing.

## Verify

- License init returns success (log the callback result, do not ignore it).
- Preview renders and `startCapturing` returns no error.
- A still image decodes through the same router, isolating camera problems.
- Backgrounding and returning to the screen does not show a black preview.
- Camera permission denial produces a readable message, not a blank screen.

## Samples

- Barcode mobile: https://github.com/Dynamsoft/barcode-reader-mobile-samples
- Capture Vision mobile: https://github.com/Dynamsoft/capture-vision-mobile-samples
- Document Normalizer mobile: https://github.com/Dynamsoft/document-normalizer-mobile-samples
- Label Recognizer mobile: https://github.com/Dynamsoft/label-recognizer-mobile-samples
- Code Parser mobile: https://github.com/Dynamsoft/code-parser-mobile-samples
- MRZ mobile: https://github.com/Dynamsoft/mrz-scanner-mobile (+ `-flutter`, `-maui`, `-react-native`)
- Camera Enhancer mobile: https://github.com/Dynamsoft/camera-enhancer-mobile-samples
