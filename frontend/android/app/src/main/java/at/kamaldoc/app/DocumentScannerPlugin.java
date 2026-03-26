package at.kamaldoc.app;

import android.app.Activity;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.mlkit.vision.documentscanner.GmsDocumentScanner;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Capacitor plugin wrapping Google ML Kit Document Scanner.
 *
 * Uses SCANNER_MODE_BASE (manual mode):
 * - No automatic document detection / auto-capture
 * - User manually triggers each scan
 * - Supports multiple pages (no page limit)
 * - Gallery import disabled (dedicated gallery flow exists)
 * - Returns JPEG images as base64 data URLs
 */
@CapacitorPlugin(name = "DocumentScanner")
public class DocumentScannerPlugin extends Plugin {

    private ActivityResultLauncher<IntentSenderRequest> scannerLauncher;
    private PluginCall savedCall;

    @Override
    public void load() {
        super.load();
        scannerLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            this::handleScanResult
        );
    }

    @PluginMethod
    public void scan(PluginCall call) {
        savedCall = call;

        GmsDocumentScannerOptions options = new GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(false)
            .setPageLimit(100)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE)
            .build();

        GmsDocumentScanner scanner = GmsDocumentScanning.getClient(options);

        scanner.getStartScanIntent(getActivity())
            .addOnSuccessListener(intentSender -> {
                try {
                    scannerLauncher.launch(new IntentSenderRequest.Builder(intentSender).build());
                } catch (Exception e) {
                    call.reject("Failed to start scanner: " + e.getMessage());
                }
            })
            .addOnFailureListener(e -> {
                call.reject("Scanner unavailable: " + e.getMessage());
            });
    }

    private void handleScanResult(ActivityResult result) {
        if (savedCall == null) return;

        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            GmsDocumentScanningResult scanResult =
                GmsDocumentScanningResult.fromActivityResultIntent(result.getData());

            if (scanResult != null && scanResult.getPages() != null && !scanResult.getPages().isEmpty()) {
                try {
                    JSArray pages = new JSArray();
                    for (GmsDocumentScanningResult.Page page : scanResult.getPages()) {
                        Uri imageUri = page.getImageUri();
                        InputStream is = getContext().getContentResolver().openInputStream(imageUri);
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = is.read(buffer)) != -1) {
                            baos.write(buffer, 0, len);
                        }
                        is.close();
                        String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                        pages.put("data:image/jpeg;base64," + base64);
                    }
                    JSObject ret = new JSObject();
                    ret.put("pages", pages);
                    savedCall.resolve(ret);
                } catch (Exception e) {
                    savedCall.reject("Error reading scanned pages: " + e.getMessage());
                }
            } else {
                savedCall.reject("No pages scanned");
            }
        } else {
            savedCall.reject("Scan cancelled");
        }
        savedCall = null;
    }
}

