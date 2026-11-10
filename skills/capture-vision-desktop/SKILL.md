---
name: capture-vision-desktop
description: Dynamsoft SDKs in server and desktop code with Python, .NET, Java, C++, Node.js and Electron. Covers barcode and QR decoding from images and PDFs, document normalization, MRZ parsing, result item typing, per-language license initialization, and the native asset and handle-release rules that break batch jobs.
---

# Capture Vision on desktop and server

Same `CaptureVisionRouter`, one template string per capability:

| Capability | Template |
| --- | --- |
| Barcodes / QR | `ReadBarcodes_Default` |
| Document boundaries | `DetectDocumentBoundaries_Default` |
| Boundaries + normalization | `DetectAndNormalizeDocument_Default` |
| MRZ | `ReadPassportAndId` (`ReadPassport`, `ReadId`) |
| Text lines / labels | `RecognizeTextLines_Default` |

There are **no ready-to-use wrappers** on these platforms — the router is the only entry point.

## Packages

| Platform | Install |
| --- | --- |
| Python | `pip install dynamsoft-barcode-reader-bundle` (11.6.5000) or `dynamsoft-capture-vision-bundle` (3.6.5000) |
| .NET | `dotnet add package Dynamsoft.DotNet.BarcodeReader.Bundle` |
| Java | `com.dynamsoft:dbr` from `https://download2.dynamsoft.com/maven/dbr/jar` |
| C++ | desktop installer; link `DynamsoftCore`, `DynamsoftLicense`, `DynamsoftCaptureVisionRouter` |
| Node.js | `npm i dynamsoft-capture-vision-for-node` (3.6.4003) + `dynamsoft-capture-vision-for-node-model` |
| Electron | the Node.js package, run in the main process |

## License

1. `get_trial_license` with the product (`dcv` for the full bundle, `dbr` for barcode-only) and
   `package: "desktop"`.
2. `status: "login_required"` means a browser window opened — ask the user to finish the Google
   sign-in, then call again; the session is reused.
3. Put `licenseKey` in `DYNAMSOFT_LICENSE_KEY`; show only `licenseKeyMasked` in chat.
4. `get_license_guide` with `platform` (`python`, `dotnet`, `java`, `cpp`, `nodejs`) returns the call.

| Language | Initialise once, before any router |
| --- | --- |
| Python | `error_code, error_message = LicenseManager.init_license(key)` |
| .NET | `LicenseManager.InitLicense(key)` |
| Java | `LicenseManager.initLicense(key)` |
| C++ | `CLicenseManager::InitLicense(key, error, sizeof(error))` |
| Node.js | `LicenseManager.initLicense(key)` |

The key is edition-scoped, not product-scoped: a `cross-platform` or `web` key covers the same code
across products, while a `desktop` key is rejected by a browser runtime with
`License mismatch: Browser requested`. Ask for the edition that matches where the code runs.

## Python: barcode from an image

Verified end-to-end (2026-11-10) with `dynamsoft-barcode-reader-bundle` 11.6.5000 and
`dynamsoft-capture-vision-bundle` 3.6.5000.

```python
import os
import sys

from dynamsoft_barcode_reader_bundle import (
    CaptureVisionRouter, EnumCapturedResultItemType, EnumErrorCode, EnumPresetTemplate, LicenseManager,
)


def scan(path: str) -> list[str]:
    error_code, error_message = LicenseManager.init_license(os.environ["DYNAMSOFT_LICENSE_KEY"])
    if error_code != EnumErrorCode.EC_OK:
        raise RuntimeError(f"license failed: {error_message}")

    router = CaptureVisionRouter()
    result = router.capture(path, EnumPresetTemplate.PT_READ_BARCODES.value)
    if result.get_error_code() != EnumErrorCode.EC_OK:
        raise RuntimeError(f"capture failed: {result.get_error_string()}")

    texts = []
    for item in result.get_items():
        if item.get_type() != EnumCapturedResultItemType.CRIT_BARCODE:
            continue
        texts.append(item.get_text())          # no cast needed
    return texts


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scan.py <image-or-pdf>")
    found = scan(sys.argv[1])
    print("\n".join(found) if found else "no barcodes found")
```

Two details that trip up generated code:

- **The import path follows the package**: `dynamsoft_barcode_reader_bundle` for the barcode bundle,
  `dynamsoft_capture_vision_bundle` for Capture Vision. Class names are identical.
- **Do not cast result items in Python.** Current bindings return concrete `BarcodeResultItem`
  objects; `BarcodeResultItem(item)` raises `TypeError`. .NET and Java still need the cast, C++ needs
  `CastTo()` — see `references/languages.md`.

Other rules that matter:

- `EnumPresetTemplate.PT_READ_BARCODES.value` is the template string; passing the enum does not work.
- Zero items is a **success**, not an error: report "no barcodes found".
- A multi-page PDF or TIFF yields several results from one `capture()` call.

## Document and MRZ on desktop

Document normalization returns two item types, depending on the template:

```python
result = router.capture(path, "DetectAndNormalizeDocument_Default")
for item in result.get_items():
    if item.get_type() == EnumCapturedResultItemType.CRIT_DETECTED_QUAD:
        print(item.get_location().points)                    # corners
    elif item.get_type() == EnumCapturedResultItemType.CRIT_NORMALIZED_IMAGE:
        item.save_to_file("page.jpg")                        # or get_image_data()
```

MRZ uses the parsed result item; read fields by name, do not parse the zone yourself:

```python
result = router.capture(path, "ReadPassportAndId")
for item in result.get_items():
    if item.get_type() != EnumCapturedResultItemType.CRIT_PARSED_RESULT:
        continue
    print(item.get_code_type())                    # MRTD_TD1_ID | MRTD_TD2_ID | MRTD_TD3_PASSPORT
    print(item.get_field_value("documentNumber"))
```

`ReadPassport` on an ID card returns nothing — default to `ReadPassportAndId`.

## Other languages

`references/languages.md` carries the .NET, Java, C++ and Node.js entry points, including the exact
cast rules per binding.

## Pitfalls

1. **Native assets ship with the package.** Do not point C++/Node builds at a CDN; keep the installed
   `dist`/`lib` tree and the model files next to the executable.
2. **License before router.** A router created before `init_license` fails in ways that look like
   decode errors.
3. **Check the result's error code**, not just the process exit code.
4. **Release native handles** (`using`, try-with-resources, `Release()`), or long batch jobs leak.
5. **Reuse one router** across a batch of images; creating a router per file is correct but slow.
6. **Electron**: initialise in the main process; the renderer cannot load the native module.

## Verify

- `initLicense` returns the success code (check it, do not ignore it).
- One known-good image decodes and prints text.
- An image with no barcode prints "no barcodes found" rather than throwing.
- A second `capture()` on the same router still works.

## Samples

- Python barcode: https://github.com/Dynamsoft/barcode-reader-python-samples
- Python Capture Vision: https://github.com/Dynamsoft/capture-vision-python-samples
- .NET: https://github.com/Dynamsoft/barcode-reader-dotnet-samples
- Java: https://github.com/Dynamsoft/barcode-reader-java-samples
- C++: https://github.com/Dynamsoft/barcode-reader-c-cpp-samples
- Node.js: https://github.com/Dynamsoft/capture-vision-nodejs-samples
- Electron: https://github.com/Dynamsoft/barcode-reader-electron-nodejs
