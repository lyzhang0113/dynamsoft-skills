# Mobile platform setup

## Android

**Dependencies** (`app/build.gradle.kts`):

```kotlin
dependencies {
    implementation("com.dynamsoft:barcodereader:11.6.4000")
    // or, for Capture Vision (barcode + document + MRZ):
    // implementation("com.dynamsoft:capturevision:3.6.4000")
}
```

If the artifact is not on Maven Central, add the Dynamsoft repository:

```kotlin
repositories {
    maven { url = uri("https://download2.dynamsoft.com/maven/aar") }
}
```

**Manifest**:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

**Runtime permission** — request before creating `CameraEnhancer`, and handle denial by showing a
plain message instead of an empty preview.

**License** — `BuildConfig` field fed from a local, uncommitted `gradle.properties`:

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        buildConfigField("String", "DYNAMSOFT_LICENSE_KEY", "\"${project.findProperty("dynamsoftLicense") ?: ""}\"")
        buildFeatures { buildConfig = true }
    }
}
```

```properties
# ~/.gradle/gradle.properties  (outside the repository)
dynamsoftLicense=DLS2...
```

**Lifecycle** — `cameraEnhancer.close()` in `onPause`, re-open in `onResume`; release the router in
`onDestroy`. Keep the enhancer in the ViewModel or Fragment so a configuration change reuses it.

## iOS

**Swift Package Manager**:

```swift
.package(url: "https://github.com/Dynamsoft/barcode-reader-spm", from: "11.6.4000")
```

**Info.plist**:

```xml
<key>NSCameraUsageDescription</key>
<string>Scan barcodes with the camera</string>
```

**License** — read from a plist or xcconfig that is excluded from version control:

```swift
enum AppConfig {
    static let licenseKey = Bundle.main.object(forInfoDictionaryKey: "DYNAMSOFT_LICENSE_KEY") as? String ?? ""
}
```

**Wiring** — a `UIViewController` (or a `UIViewRepresentable` in SwiftUI) holds the `CameraView`,
the `CaptureVisionRouter`, and conforms to `CapturedResultReceiver`:

```swift
final class ScannerViewController: UIViewController, CapturedResultReceiver {
    private let cameraView = CameraView()
    private let cvr = CaptureVisionRouter()

    override func viewDidLoad() {
        super.viewDidLoad()
        cameraView.frame = view.bounds
        view.addSubview(cameraView)
        cvr.setInput(cameraView)
        cvr.addResultReceiver(self)
        cvr.startCapturing("ReadBarcodes_Default") { _, error in
            if let error { print("start failed: \(error)") }
        }
    }

    func onDecodedBarcodesReceived(_ result: DecodedBarcodesResult) {
        guard let items = result.items else { return }
        for item in items { print("\(item.formatString): \(item.text)") }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        cvr.stopCapturing()
    }
}
```

## Flutter

```yaml
dependencies:
  flutter_barcode_sdk: ^2.2.0          # barcode/QR, wraps the core API
```

```dart
final sdk = FlutterBarcodeSdk();
await sdk.setLicense(licenseKey);      // from a --dart-define or a secrets file
await sdk.init();
final results = await sdk.decodeFile(path);
```

The plugin wraps the core `CaptureVisionRouter`, not the RTU component, so it keeps the
programmability the rest of this skill assumes. For camera preview, use `flutter_barcode_sdk`'s
camera helpers or pair it with the `camera` package and feed frames to the SDK.

## React Native

The Dynamsoft React Native package exposes license init and decoding through a native module. Call
init once at app start:

```ts
await DynamsoftBarcodeReader.initLicense(licenseKey);
const results = await DynamsoftBarcodeReader.decodeFile(path);
```

Camera preview is a native view; keep the JS side to configuration and result handling.

## .NET MAUI

```xml
<PackageReference Include="Dynamsoft.DotNet.BarcodeReader.Bundle" Version="11.6.4000" />
```

Initialize in `MauiProgram.CreateMauiApp()` via `LicenseManager.InitLicense(...)`, then host the
`CameraView` in a platform handler. Camera/microphone permissions go in `Platforms/Android/AndroidManifest.xml`
and `Platforms/iOS/Info.plist`.

## Permission matrix

| Platform | Declare | Request |
| --- | --- | --- |
| Android | `CAMERA` in manifest | runtime `ActivityResultContracts.RequestPermission` |
| iOS | `NSCameraUsageDescription` | automatic on first camera use |
| Flutter | plugin handles Android/iOS | plugin handles |
| React Native | native manifests | native module |
| MAUI | Android manifest / iOS plist | platform handler |
