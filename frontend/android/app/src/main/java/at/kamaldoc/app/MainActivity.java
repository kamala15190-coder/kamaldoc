package at.kamaldoc.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DocumentScannerPlugin.class);
        // Edge-to-Edge (Android 15+): Die WebView zeichnet randlos hinter Status-
        // und Navigationsleiste. Aufruf vor super.onCreate() gemäß androidx-Empfehlung.
        // Ab Android 15 (targetSdk 35+) erzwingt das System dies ohnehin; der explizite
        // Aufruf liefert zusätzlich konsistentes randloses Verhalten auf älteren API-
        // Levels und setzt transparente Systemleisten mit passenden Scrims.
        // Bewusst KEIN festes isAppearanceLightStatusBars: Die Icon-Helligkeit der
        // Systemleisten steuert das @capacitor/status-bar-Plugin themenabhängig
        // (StatusBar.setStyle in useTheme.jsx) — ein Hardcode würde damit kollidieren.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
