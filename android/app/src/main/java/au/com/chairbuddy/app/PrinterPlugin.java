package au.com.chairbuddy.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * window.print() is a no-op in Android WebView, so the web app calls this
 * instead. The WebView print adapter applies print-media CSS, so
 * GamePrintView renders as it does in a browser; the system print dialog
 * offers "Save as PDF".
 */
@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        String jobName = call.getString("jobName", "Chair Buddy");
        getActivity().runOnUiThread(() -> {
            PrintManager printManager =
                (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            PrintDocumentAdapter adapter = getBridge().getWebView().createPrintDocumentAdapter(jobName);
            PrintAttributes attributes = new PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .build();
            printManager.print(jobName, adapter, attributes);
            JSObject result = new JSObject();
            result.put("completed", true);
            call.resolve(result);
        });
    }
}
