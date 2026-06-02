package at.kamaldoc.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // registerPlugin MUSS vor super.onCreate() laufen (Capacitor-Vorgabe).
        registerPlugin(DocumentScannerPlugin.class);
        super.onCreate(savedInstanceState);

        // Edge-to-Edge (Android 15+): Die WebView zeichnet randlos hinter Status-
        // und Navigationsleiste. Bewusst der minimale, breitest-kompatible Ansatz über
        // androidx.core.WindowCompat (ab core 1.5 verfügbar — deckt minSdk 24 voll ab)
        // statt androidx.activity EdgeToEdge.enable(): weniger Abhängigkeits- und
        // Konfliktfläche, und der Aufruf steht idiomatisch NACH super.onCreate().
        // Die Transparenz + Icon-Helligkeit der Systemleisten managt das
        // @capacitor/status-bar-Plugin themenabhängig (setOverlaysWebView/setStyle);
        // die Insets behandelt das Frontend via env(safe-area-inset-*).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
