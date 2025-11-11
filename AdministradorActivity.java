// mobile/android/app/src/main/java/com/condoconnect/ai/administrador/AdministradorActivity.java
package com.condoconnect.ai.administrador;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;

public class AdministradorActivity extends AppCompatActivity {
    @Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_residente); // ← Usa el layout
    WebView webView = findViewById(R.id.webview_residente);
    webView.getSettings().setJavaScriptEnabled(true);
    webView.loadUrl("file:///android_asset/residente/index.html");
}