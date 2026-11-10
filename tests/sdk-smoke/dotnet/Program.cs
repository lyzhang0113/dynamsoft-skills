// .NET smoke test: decode the QR fixture with Dynamsoft.DotNet.BarcodeReader.Bundle.
using Dynamsoft.CVR;
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

var licenseError = LicenseManager.InitLicense(key, out var licenseMessage);
if (licenseError != 0)
{
    Console.Error.WriteLine($"license failed: {licenseError} {licenseMessage}");
    return 1;
}

var router = new CaptureVisionRouter();
// The template name is a plain string in the .NET binding.
var result = router.Capture(args[0], "ReadBarcodes_Default");
if (result.GetErrorCode() != 0)
{
    Console.Error.WriteLine($"capture failed: {result.GetErrorCode()} {result.GetErrorString()}");
    return 1;
}

var found = 0;
var decoded = result.GetDecodedBarcodesResult();
if (decoded is not null)
{
    foreach (var item in decoded.GetItems())
    {
        Console.WriteLine($"text: {item.GetText()}");
        found++;
    }
}

Console.WriteLine($"items: {found}");
return found > 0 ? 0 : 1;
