# Sample Code Index

Use this file before writing code. Prioritize sample repositories and example folders over general documentation whenever the user asks for runnable code.

## Dynamsoft Official Sample Hub

- Dynamsoft GitHub organization: https://github.com/Dynamsoft
The Dynamsoft GitHub hub groups samples by use case, including document scanning, barcode reading, batch barcode scanning, and MRZ scanning. Use it to discover additional platform-specific repositories.

## Community & Developer SDK Integrations (by yushulx)

Excellent community-led integrations of Dynamsoft SDKs across various frameworks and platforms:

- **Trial license provisioning**: the bundled Dynamsoft license MCP
  - Call `get_trial_license` for the product and edition a sample targets, then put the key in
    `DYNAMSOFT_LICENSE_KEY`. Without it, samples that need a key fail at startup with a license
    error rather than a decode error.
- **Web Document Scan Management**: [web-twain-document-scan-management](https://github.com/yushulx/web-twain-document-scan-management)
  - Comprehensive document scanning samples using Web TWAIN for React, Angular, Electron, Express, and Flutter WebView.
- **Web Barcode Scanner**: [javascript-barcode-qr-code-scanner](https://github.com/yushulx/javascript-barcode-qr-code-scanner)
  - Web-based scanner implementation using the Dynamsoft JavaScript SDK.
- **Multi-Platform Flutter Scanning**: [flutter-barcode-mrz-document-scanner](https://github.com/yushulx/flutter-barcode-mrz-document-scanner)
  - Cross-platform Flutter examples (Web, Android, iOS, Windows, Linux) combining barcode, MRZ, and document scanning.
- **Python Barcode Wrapper**: [python-barcode-qrcode-sdk](https://github.com/yushulx/python-barcode-qrcode-sdk)
  - Python wrapper and examples for Dynamsoft Barcode Reader and Capture Vision.
- **.NET Barcode Wrapper**: [dotnet-barcode-qr-code-sdk](https://github.com/yushulx/dotnet-barcode-qr-code-sdk)
  - .NET wrapper for barcode recognition on Windows, Linux, and macOS.
- **Node.js Scanner Wrapper**: [docscan4nodejs](https://github.com/yushulx/docscan4nodejs)
  - Node.js wrapper for the Dynamic Web TWAIN Service.

---

## DCV / Capture Vision Samples

Use DCV samples for modern barcode, QR, MRZ, document detection, document normalization, and multi-capture workflows.

### JavaScript / TypeScript / Web
- **Combined Barcode + MRZ + Document Detection**: [javascript-barcode-qr-code-scanner examples/barcode_mrz_document](https://github.com/yushulx/javascript-barcode-qr-code-scanner/tree/main/examples/barcode_mrz_document)
  - Use this first when the user asks for browser/web code that combines barcode, MRZ, and document detection. Excellent for DCV-style multi-result parsing and camera-based web workflow.
- **Official JS Barcode Samples**: https://github.com/Dynamsoft/barcode-reader-javascript-samples
- **Official MRZ Scanner JS Sample**: https://github.com/Dynamsoft/mrz-scanner-javascript
- **Official MRZ Scanner Mobile Samples (Android/iOS)**: https://github.com/Dynamsoft/mrz-scanner-mobile
- **Official Document Scanner JS Sample**: https://github.com/Dynamsoft/document-scanner-javascript
  - Camera-based document detection, edge detection, and document capture UI.

### Python / Server / Desktop
- **Python DCV Examples**: [python-barcode-qrcode-sdk examples/official/dcv](https://github.com/yushulx/python-barcode-qrcode-sdk/tree/main/examples/official/dcv)
  - Use this first for Python DCV, server/desktop image decoding, barcode/QR, and document/MRZ-related Capture Vision workflows. Includes standard script logic and multi-modal desktop applications.
- **Official Python Barcode Samples**: https://github.com/Dynamsoft/barcode-reader-python-samples

### Mobile / Cross-Platform
- **Official Barcode Mobile Samples**: https://github.com/Dynamsoft/barcode-reader-mobile-samples
  - Use for Android/iOS barcode scanning, permission handling, camera lifecycle, and native result callbacks.
- **Flutter SDK Plugins**:
  - Barcode SDK: https://github.com/yushulx/flutter_barcode_sdk
  - MRZ/OCR SDK: https://github.com/yushulx/flutter_capture_vision
  - Document Scan SDK: https://github.com/yushulx/flutter_capture_vision
- **React Native, MAUI**: Search the Dynamsoft GitHub organization for the framework-specific samples.

---

## Dynamic Web TWAIN (DWT) Samples

Use DWT samples when the user needs browser-based physical scanner acquisition (TWAIN/SANE/WIA/eSCL).

- **Official Web TWAIN Samples**: https://github.com/Dynamsoft/web-twain-samples
- **Dynamic Web TWAIN Package**: https://github.com/Dynamsoft/Dynamic-Web-TWAIN
- **React Advanced DWT Sample**: https://github.com/Dynamsoft/web-twain-react-advanced
- **React Advanced Mode DWT Sample**: https://github.com/Dynamsoft/web-twain-react-advanced-mode
- **Angular Advanced DWT Sample**: https://github.com/Dynamsoft/web-twain-angular-advanced
- **Angular CLI DWT Sample**: https://github.com/Dynamsoft/web-twain-angular-cli-application
- **Vue Advanced DWT Sample**: https://github.com/Dynamsoft/web-twain-vue-advanced
- **DWT REST .NET Sample**: https://github.com/Dynamsoft/Dynamic-Web-TWAIN-REST-dotnet

---

## Dynamsoft Document Viewer (DDV) Samples

Use DDV samples when the user asks for browser document viewer UI, page operations, image/PDF viewing, or annotation workflows.

- **DDV Sample Repository**: https://github.com/Dynamsoft/document-viewer-samples
- **DDV Documentation**: https://www.dynamsoft.com/document-viewer/docs/

---

## Choosing Samples & Adapter Rules

1. **Always Include Links**: When generating code, always output the link to the closest matching sample before or after the code block.
2. **Prefer DCV core API samples over RTU samples**: Some official samples use RTU (ready-to-use) wrapper components (`BarcodeScanner`, `BarcodeReader`, `DocumentScanner`, etc.). These are built on top of the DCV core APIs and have poor programmability and flexibility. When adapting a sample that uses RTU, **rewrite the code to use `CaptureVisionRouter` + `CameraEnhancer` + `CameraView` + `CapturedResultReceiver` directly** instead of the RTU wrapper. The core API patterns in the `capture-vision-web` skill serve as the reference for this rewrite.
3. **Platform Adaptation**: If a sample uses a different framework but the same SDK workflow, adapt the framework architecture (e.g. React hooks, Vue lifecycle, Angular services) while preserving SDK initialization, resource path, template names, and result parsing patterns.
4. **Version Matching**: Match the user's SDK version. If unspecified, assume the latest **DCV v3.x / DBR v11.x / DWT v19.x / DDV v5.x** standards and clearly state the version assumption.
