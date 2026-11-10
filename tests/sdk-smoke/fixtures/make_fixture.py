#!/usr/bin/env python3
"""Generate the QR fixture that every smoke test decodes."""

import sys

import qrcode

out = sys.argv[1] if len(sys.argv) > 1 else "fixture.png"
qrcode.make("https://www.dynamsoft.com/ smoke-test", box_size=10, border=4).save(out)
print(f"wrote {out}")
