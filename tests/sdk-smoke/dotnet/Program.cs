// .NET smoke test: decode the QR fixture with Dynamsoft.DotNet.BarcodeReader.Bundle.
using Dynamsoft.Core;
using Dynamsoft.CVR;
using Dynamsoft.DBR;
using Dynamsoft.License;

if (args.Length != 1)
{
    Console.Error.WriteLine("usage: dotnet run -- <image>");
    return 2;
}

var key = Environment.GetEnvironmentVariable("DYNAMSOFT_LICENSE_KEY");
if (string.IsNullOrEmpty(key))
{
    Console.Error.WriteLine("no DYNAMSOFT_LICENSE_KEY");
    return 2;
}

var licenseError = LicenseManager.InitLicense(key);
if (licenseError != 0)
{
    Console.Error.WriteLine($"license failed: {licenseError}");
    return 1;
}

var router = new CaptureVisionRouter();
var result = router.Capture(args[0], EnumPresetTemplate.PT_READ_BARCODES);
if (result.GetErrorCode() != 0)
{
    Console.Error.WriteLine($"capture failed: {result.GetErrorString()}");
    return 1;
}

var found = 0;
foreach (var item in result.GetItems())
{
    if (item.GetItemType() != EnumCapturedResultItemType.CRIT_BARCODE) continue;
    if (item is BarcodeResultItem barcode)
    {
        Console.WriteLine($"text: {barcode.GetText()}");
        found++;
    }
}

Console.WriteLine($"items: {found}");
return found > 0 ? 0 : 1;
