# Server/desktop entry points

All four platforms use `CaptureVisionRouter` with a preset template string. The differences are
the type names and how the native library is loaded.

## Casting: only when the binding returns a generic item

Verified on 2026-11-10: the **Python** bindings return concrete `BarcodeResultItem` objects, and
`BarcodeResultItem(item)` raises `TypeError` — check the type and call the getter directly. The
managed bindings (.NET, Java) hand back the base `CapturedResultItem`, so they still need the cast
(`item as BarcodeResultItem`, `instanceof`). In C++, `GetItem()` returns `CCapturedResultItem*` and
`CastTo()` is how you reach the barcode subclass. If a cast fails at runtime with "no constructor",
the binding already returned the concrete type — drop the cast.

## .NET

```csharp
using Dynamsoft.Core;
using Dynamsoft.CaptureVisionRouter;
using Dynamsoft.License;

var errorCode = LicenseManager.InitLicense(
    Environment.GetEnvironmentVariable("DYNAMSOFT_LICENSE_KEY"));
if (errorCode != EnumErrorCode.EC_OK)
    throw new InvalidOperationException($"license failed: {errorCode}");

using var router = new CaptureVisionRouter();
using var result = router.Capture(imagePath, EnumPresetTemplate.PT_READ_BARCODES);

foreach (var item in result.GetItems())
{
    if (item.GetType() != EnumCapturedResultItemType.CRIT_BARCODE) continue;
    var barcode = item as BarcodeResultItem;   // cast before using barcode getters
    Console.WriteLine($"{barcode.GetFormatString()} {barcode.GetText()}");
}
```

`Capture()` returns an `IDisposable`; keep it in a `using` so the native buffer is released.

## Java

Verified against `com.dynamsoft:dbr:11.6.5000` on JDK 17. Two API details differ from the other
bindings:

- `LicenseManager.initLicense(key)` returns a **`LicenseError`**, not an int — read
  `error.getErrorCode()` / `error.getErrorString()`.
- `EnumPresetTemplate` is an interface holding **String constants**, so `EnumPresetTemplate.PT_READ_BARCODES`
  can be passed straight to `capture(path, templateName)`.
- `CaptureVisionRouter` is not `AutoCloseable`; do not use try-with-resources on it.

```java
import com.dynamsoft.core.EnumCapturedResultItemType;
import com.dynamsoft.cvr.CaptureVisionRouter;
import com.dynamsoft.cvr.CapturedResult;
import com.dynamsoft.cvr.EnumPresetTemplate;
import com.dynamsoft.dbr.BarcodeResultItem;
import com.dynamsoft.license.LicenseError;
import com.dynamsoft.license.LicenseManager;

public class Scan {
    public static void main(String[] args) throws Exception {
        LicenseError error = LicenseManager.initLicense(System.getenv("DYNAMSOFT_LICENSE_KEY"));
        System.out.println(error.getErrorCode() + " " + error.getErrorString());
        if (error.getErrorCode() != 0) return;

        CaptureVisionRouter router = new CaptureVisionRouter();
        CapturedResult result = router.capture(args[0], EnumPresetTemplate.PT_READ_BARCODES);
        System.out.println(result.getErrorCode() + " " + result.getErrorString());

        for (var item : result.getItems()) {
            if (item.getType() != EnumCapturedResultItemType.CRIT_BARCODE) continue;
            BarcodeResultItem barcode = (BarcodeResultItem) item;
            System.out.println(barcode.getFormatString() + " " + barcode.getText());
        }
    }
}
```

`CapturedResult` also exposes aggregate getters — `getDecodedBarcodesResult()`,
`getRecognizedTextLinesResult()`, `getProcessedDocumentResult()`, `getParsedResult()` — unlike the
JavaScript bundle, where you filter `items`.

The Maven artifact needs the Dynamsoft repository in `pom.xml`
(`https://download2.dynamsoft.com/maven/dbr/jar`, artifact `com.dynamsoft:dbr`). The jar bundles the
native libraries for Windows, Linux (x64/arm64) and macOS (universal2), so the same artifact works on
all three CI runners.

```bash
javac -cp lib/dbr-11.6.5000.jar -d classes Scan.java
java  -cp "lib/dbr-11.6.5000.jar;classes" Scan image.png      # ':' instead of ';' on Linux/macOS
```

## C++

```cpp
#include "DynamsoftLicenseManager.h"
#include "DynamsoftCaptureVisionRouter.h"

char error[512] = {0};
if (CLicenseManager::InitLicense(key.c_str(), error, sizeof(error)) != 0) {
    std::cerr << "license failed: " << error << std::endl;
    return 1;
}

CCaptureVisionRouter* router = nullptr;
CCaptureVisionRouter::CreateInstance(&router);
CCapturedResult* result = nullptr;
router->Capture(imagePath.c_str(), "ReadBarcodes_Default", &result);

int count = 0;
result->GetItemsCount(&count);
for (int i = 0; i < count; i++) {
    const CCapturedResultItem* item = nullptr;
    result->GetItem(i, &item);
    if (item->GetType() != EnumCapturedResultItemType::CRIT_BARCODE) continue;
    const CBarcodeResultItem* barcode = nullptr;
    item->CastTo(&barcode);                       // required, as in Python
    const char* text = nullptr;
    barcode->GetText(&text);
    std::cout << text << std::endl;
}
// Release: result->Release(); router->Destroy();
```

Link `DynamsoftCore`, `DynamsoftLicense`, `DynamsoftCaptureVisionRouter` (and the barcode
component). Ship the `Dist/Lib` and model files with the executable.

## Node.js

Verified against `dynamsoft-capture-vision-for-node` 3.6.4003. The API is **static**, not
instance-based, and it needs the model package for most templates:

```bash
npm i dynamsoft-capture-vision-for-node dynamsoft-capture-vision-for-node-model
```

```js
import { CaptureVisionRouter, EnumPresetTemplate, LicenseManager } from "dynamsoft-capture-vision-for-node";

LicenseManager.initLicense(process.env.DYNAMSOFT_LICENSE_KEY);   // returns void

const result = await CaptureVisionRouter.captureAsync(
  "image.png",
  EnumPresetTemplate.PT_READ_BARCODES            // pass the enum, not .value
);

for (const item of result.barcodeResultItems ?? []) {
  console.log(item.formatString, item.text);
}

// Required, or the process never exits: the SDK keeps worker threads alive.
await CaptureVisionRouter.terminateIdleWorkers();
```

- `captureAsync` runs in worker threads; `capture` is the synchronous, main-thread variant. The
  worker count is `CaptureVisionRouter.maxWorkerCount` (default: logical CPUs − 1).
- `captureMultiPagesAsync` handles multi-page PDFs and TIFFs.
- Input may be a file path, a `Uint8Array`, or a `DCVImageData` object. Bytes are **transferred** to
  the worker by default; pass `{ templateName, dataTransferType: "copy" }` to keep them.
- `initSettings(<file>)` loads a custom template; a custom template must declare
  `CaptureVisionModelOptions` explicitly or every call fails with "Model file is not found".
- Electron: run it in the main process — the renderer cannot load the native module.

## Common rules

- One license init per process, before the first router.
- Template is a **string** (`"ReadBarcodes_Default"`); the enum is a convenience wrapper whose
  `.value` is that string.
- Zero items is a success, not a failure.
- Always cast the generic item to the barcode type before calling barcode-specific getters.
- Release native handles (`using` / `try-with-resources` / `Release()`), or long batch jobs leak
  memory.
