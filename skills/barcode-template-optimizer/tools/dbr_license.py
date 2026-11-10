import os

try:
    from dynamsoft_capture_vision_bundle import EnumErrorCode, LicenseManager
except ImportError as exc:
    raise SystemExit(
        "[DBR] The 'dynamsoft-capture-vision-bundle' package is required. "
        "Install it with: pip install dynamsoft-capture-vision-bundle"
    ) from exc


LICENSE_HELP = (
    "Set the DYNAMSOFT_LICENSE_KEY environment variable to your Dynamsoft license key. "
    "30-day trial: "
    "https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform"
)

_LICENSE_READY = False


def ensure_dbr_license():
    global _LICENSE_READY

    if _LICENSE_READY:
        return

    key = os.environ.get("DYNAMSOFT_LICENSE_KEY")
    if not key:
        raise SystemExit("[DBR] No license key configured. " + LICENSE_HELP)

    err, msg = LicenseManager.init_license(key)
    if err not in (EnumErrorCode.EC_OK, EnumErrorCode.EC_LICENSE_CACHE_USED):
        # Log only the error code — the message text may contain licensing
        # diagnostics that should not be echoed to stdout.
        raise SystemExit(f"[DBR] License initialization failed (error code {err}). " + LICENSE_HELP)

    _LICENSE_READY = True
