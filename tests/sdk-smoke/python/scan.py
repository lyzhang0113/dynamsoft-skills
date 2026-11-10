"""Python smoke test: decode the QR fixture with the DBR bundle."""

import os
import sys

from dynamsoft_barcode_reader_bundle import (
    CaptureVisionRouter,
    EnumCapturedResultItemType,
    EnumErrorCode,
    EnumPresetTemplate,
    LicenseManager,
)


def main(path: str) -> int:
    key = os.environ.get("DYNAMSOFT_LICENSE_KEY")
    if not key:
        print("no DYNAMSOFT_LICENSE_KEY")
        return 2

    code, message = LicenseManager.init_license(key)
    if code != EnumErrorCode.EC_OK:
        print(f"license failed: {message}")
        return 1

    result = CaptureVisionRouter().capture(path, EnumPresetTemplate.PT_READ_BARCODES.value)
    if result.get_error_code() != EnumErrorCode.EC_OK:
        print(f"capture failed: {result.get_error_string()}")
        return 1

    found = 0
    for item in result.get_items():
        if item.get_type() != EnumCapturedResultItemType.CRIT_BARCODE:
            continue
        print(f"text: {item.get_text()}")
        found += 1
    print(f"items: {found}")
    return 0 if found > 0 else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scan.py <image>")
    raise SystemExit(main(sys.argv[1]))
