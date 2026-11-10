// Node.js smoke test: decode the QR fixture with dynamsoft-capture-vision-for-node.
import { CaptureVisionRouter, EnumPresetTemplate, LicenseManager } from "dynamsoft-capture-vision-for-node";

const [image] = process.argv.slice(2);
if (!image) {
  console.error("usage: node scan.mjs <image>");
  process.exit(2);
}

const key = process.env.DYNAMSOFT_LICENSE_KEY;
if (!key) {
  console.error("no DYNAMSOFT_LICENSE_KEY");
  process.exit(2);
}

LicenseManager.initLicense(key);          // static, returns void

let found = 0;
try {
  const result = await CaptureVisionRouter.captureAsync(image, EnumPresetTemplate.PT_READ_BARCODES);
  for (const item of result.barcodeResultItems ?? []) {
    console.log(`text: ${item.text}`);
    found++;
  }
} catch (error) {
  console.error(`capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
} finally {
  // The SDK keeps worker threads alive; without this the process never exits.
  await CaptureVisionRouter.terminateIdleWorkers().catch(() => {});
}

console.log(`items: ${found}`);
process.exit(found > 0 ? 0 : 1);
