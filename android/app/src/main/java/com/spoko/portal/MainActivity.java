package com.spoko.portal;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ensure web content respects system bars and does not overlap the notification bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
