import com.dynamsoft.core.EnumCapturedResultItemType;
import com.dynamsoft.cvr.CaptureVisionRouter;
import com.dynamsoft.cvr.CapturedResult;
import com.dynamsoft.cvr.EnumPresetTemplate;
import com.dynamsoft.dbr.BarcodeResultItem;
import com.dynamsoft.license.LicenseError;
import com.dynamsoft.license.LicenseManager;

/** Java smoke test: decode the QR fixture with com.dynamsoft:dbr. */
public class Scan {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("usage: java Scan <image>");
            System.exit(2);
        }

        String key = System.getenv("DYNAMSOFT_LICENSE_KEY");
        if (key == null || key.isEmpty()) {
            System.err.println("no DYNAMSOFT_LICENSE_KEY");
            System.exit(2);
        }

        LicenseError license = LicenseManager.initLicense(key);
        if (license.getErrorCode() != 0) {
            System.err.println("license failed: " + license.getErrorString());
            System.exit(1);
        }

        CaptureVisionRouter router = new CaptureVisionRouter();
        CapturedResult result = router.capture(args[0], EnumPresetTemplate.PT_READ_BARCODES);
        if (result.getErrorCode() != 0) {
            System.err.println("capture failed: " + result.getErrorString());
            System.exit(1);
        }

        int found = 0;
        for (var item : result.getItems()) {
            if (item.getType() != EnumCapturedResultItemType.CRIT_BARCODE) continue;
            BarcodeResultItem barcode = (BarcodeResultItem) item;
            System.out.println("text: " + barcode.getText());
            found++;
        }
        System.out.println("items: " + found);
        System.exit(found > 0 ? 0 : 1);
    }
}
