# Coverage

Every published Dynamsoft SDK, the skill that covers it, and how far that coverage has been
verified. Updated 2026-11-10.

## Verification tiers

| Tier | Meaning |
| --- | --- |
| **T1** | Code was executed on this machine against the real package and produced a result. |
| **T2** | The initialization call and package coordinates were checked against the official sample repository; no runtime here (no Android/iOS/.NET toolchain). |
| **T3** | Documented from the official docs and sample index only — no code path executed. |

A skill is only as trustworthy as its tier, so the tiers are stated rather than implied.

## Test evidence

| Test | Command | Result |
| --- | --- | --- |
| Python barcode, DBR bundle 11.6.5000 | `scan.py <dense-qr.png>` | T1, 1 barcode decoded |
| Node.js barcode, `dynamsoft-capture-vision-for-node` 3.6.4003 | `node scan2.mjs <dense-qr.png>` | T1, 1 barcode decoded |
| Web barcode, `dynamsoft-barcode-reader-bundle` 11.6.5000 in headless Chrome | `node run.mjs` (BUNDLE=dbr) | T1, 1 barcode decoded |
| Java barcode, `com.dynamsoft:dbr` 11.6.5000 on JDK 17 | `javac` + `java -cp` | T1, 1 barcode decoded |
| License provisioning through the MCP | `get_trial_license` → real portal | T1, real key issued and used by all four tests |

Document and MRZ templates could not be executed in the web harness: the Capture Vision bundle's
engine assets returned 404 from the local static server (`[createInstance] 404`), which is a harness
problem rather than an SDK result. Their item-type handling is documented from the bundle's type
definitions (`CRIT_DETECTED_QUAD = 8`, `CRIT_PARSED_RESULT = 32`) at T3.

## Product × platform matrix

### Capture Vision modules (barcode, document normalizer, label recognizer, code parser, camera enhancer)

| Platform | Language / framework | Skill | Tier |
| --- | --- | --- | --- |
| Web | JavaScript, TypeScript | `capture-vision-web` | **T1** (barcode) |
| Web | React, Vue, Angular, Next | `capture-vision-web` | T3 (lifecycle pattern) |
| Mobile | Android (Kotlin, Java) | `capture-vision-mobile` | T2 |
| Mobile | iOS (Swift, Objective-C) | `capture-vision-mobile` | T2 |
| Mobile | Flutter | `capture-vision-mobile` | T2 |
| Mobile | React Native | `capture-vision-mobile` | T2 |
| Mobile | .NET MAUI | `capture-vision-mobile` | T2 |
| Desktop | Python | `capture-vision-desktop` | **T1** |
| Desktop | Node.js | `capture-vision-desktop` | **T1** |
| Desktop | Electron | `capture-vision-desktop` | T3 (same native module as Node) |
| Desktop | .NET | `capture-vision-desktop` | T2 (SDK not installed here; covered by CI) |
| Desktop | Java | `capture-vision-desktop` | **T1** (JDK 17) |
| Desktop | C++ | `capture-vision-desktop` | T2 (no compiler here) |

### Barcode Reader bundle (barcode-only package)

Same platforms and skill mapping as Capture Vision. The barcode-only bundle ships **only** barcode
templates — requesting `DetectDocumentBoundaries_Default` from it fails with
`[-10036] The template name is invalid`, verified at T1.

### MRZ Scanner

| Platform | Package | Skill | Tier |
| --- | --- | --- | --- |
| Web | `dynamsoft-mrz-scanner` | `capture-vision-web` | T3 |
| Android / iOS | MRZ Scanner mobile SDK | `capture-vision-mobile` | T2 |
| Flutter | `mrz-scanner-mobile-flutter` | `capture-vision-mobile` | T2 |
| React Native | `mrz-scanner-mobile-react-native` | `capture-vision-mobile` | T2 |
| MAUI | `mrz-scanner-mobile-maui` | `capture-vision-mobile` | T2 |
| iOS SPM | `mrz-scanner-spm` | `capture-vision-mobile` | T2 |

MRZ is also reachable through the Capture Vision `ReadPassportAndId` template on all three
platforms, which is what the platform skills document by default.

### Document Scanner (MDS) and Mobile Web Capture

These are packaged scan flows. Any custom UX or workflow is out of scope for them by design and is
built on the Capture Vision templates instead (`capture-vision-web`).

| Product | Platform | Skill | Tier |
| --- | --- | --- | --- |
| Document Scanner | Web (`dynamsoft-document-scanner`) | `capture-vision-web` | T3 |
| Mobile Web Capture | Web, mobile browsers | `capture-vision-web` | T3 |

### Dynamic Web TWAIN

| Mode | Platform | Skill | Tier |
| --- | --- | --- | --- |
| JavaScript SDK | Browser (JS, React, Angular, Vue) | `web-twain` | T3 (no scanner or DWT service here) |
| REST API | .NET client, server/desktop apps | `web-twain` | T3 |
| Embedded service | App installer (`DynamicWebTWAIN.Service`) | `web-twain` | T3 |
| Service discovery | LAN (`DynamicWebTWAIN.ServiceFinder`) | `web-twain` | T3 |

### Document Viewer

| Platform | Package | Skill | Tier |
| --- | --- | --- | --- |
| Web | `dynamsoft-document-viewer` 5.0.1 | `document-viewer` | T3 |

### Out of scope

| Product | Why |
| --- | --- |
| Dynamic .NET TWAIN | Superseded for new work by the community [`Twain.Wia.Sane.Scanner`](https://www.nuget.org/packages/Twain.Wia.Sane.Scanner/) NuGet package; `web-twain` points Windows .NET desktop apps there. |
| Batch Barcode Scanner (BBS) | A ready-made Android/iOS app with no SDK; `dynamsoft-sdk` explains the export/integration options. |

## How to raise a tier

1. Web document/MRZ: fix the harness asset path and run `DetectAndNormalizeDocument_Default` and
   `ReadPassportAndId` in the same headless-Chrome test.
2. .NET, Java, C++: install the toolchain, then run the same decode fixture through each binding.
3. Mobile: run the official sample apps on a device or emulator and record the camera + decode path.
4. DWT: a Windows host with the service installed can validate REST acquisition end to end.
