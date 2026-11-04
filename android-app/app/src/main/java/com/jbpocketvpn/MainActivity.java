package com.jbpocketvpn;

import android.app.Activity;
import android.content.Intent;
import android.net.VpnService;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.wireguard.android.backend.BackendException;
import com.wireguard.android.backend.GoBackend;
import com.wireguard.android.backend.Tunnel;
import com.wireguard.config.Config;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final int REQUEST_VPN_PERMISSION = 41;
    private static final int REQUEST_CONFIG_FILE = 42;

    private GoBackend backend;
    private Tunnel tunnel;
    private Config config;
    private TextView status;
    private Button connectButton;
    private String tunnelName = "JB Pocket VPN";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        backend = new GoBackend(getApplicationContext());
        tunnel = new Tunnel() {
            @Override public String getName() { return tunnelName; }
            @Override public void onStateChange(State newState) {
                runOnUiThread(() -> showState(newState));
            }
        };
        buildUi();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(32, 56, 32, 32);
        root.setBackgroundColor(0xFF0B1020);

        TextView title = new TextView(this);
        title.setText("🛡  JB POCKET VPN");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        root.addView(title, matchWrap());

        TextView subtitle = new TextView(this);
        subtitle.setText("Private connection powered by WireGuard");
        subtitle.setTextColor(0xFFB8C2D9);
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = matchWrap();
        subParams.topMargin = 14;
        root.addView(subtitle, subParams);

        status = new TextView(this);
        status.setText("No VPN profile imported");
        status.setTextColor(0xFFFFD166);
        status.setTextSize(16);
        status.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusParams = matchWrap();
        statusParams.topMargin = 56;
        root.addView(status, statusParams);

        Button importButton = new Button(this);
        importButton.setText("IMPORT WIREGUARD CONFIG");
        LinearLayout.LayoutParams importParams = matchWrap();
        importParams.topMargin = 36;
        root.addView(importButton, importParams);
        importButton.setOnClickListener(v -> openConfigPicker());

        connectButton = new Button(this);
        connectButton.setText("CONNECT");
        LinearLayout.LayoutParams connectParams = matchWrap();
        connectParams.topMargin = 16;
        root.addView(connectButton, connectParams);
        connectButton.setOnClickListener(v -> toggleTunnel());

        TextView footer = new TextView(this);
        footer.setText("Your WireGuard private key stays on this device.");
        footer.setTextColor(0xFF8F9BB3);
        footer.setTextSize(12);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footerParams = matchWrap();
        footerParams.topMargin = 40;
        root.addView(footer, footerParams);

        setContentView(root);
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
    }

    private void openConfigPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(intent, REQUEST_CONFIG_FILE);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CONFIG_FILE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    getContentResolver().openInputStream(data.getData()), StandardCharsets.UTF_8))) {
                config = Config.parse(reader);
                status.setText("Profile imported — ready to connect");
                status.setTextColor(0xFF66E3A4);
                Toast.makeText(this, "WireGuard profile imported", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                config = null;
                status.setText("Could not read this config file");
                status.setTextColor(0xFFFF7777);
                Toast.makeText(this, "Invalid WireGuard config: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        } else if (requestCode == REQUEST_VPN_PERMISSION) {
            if (resultCode == RESULT_OK) startTunnel();
            else Toast.makeText(this, "VPN permission was not granted", Toast.LENGTH_LONG).show();
        }
    }

    private void toggleTunnel() {
        if (config == null) {
            Toast.makeText(this, "First export your tunnel config from WireGuard and import it here.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            if (backend.getState(tunnel) == Tunnel.State.UP) {
                backend.setState(tunnel, Tunnel.State.DOWN, null);
                showState(Tunnel.State.DOWN);
            } else {
                Intent permission = VpnService.prepare(this);
                if (permission != null) startActivityForResult(permission, REQUEST_VPN_PERMISSION);
                else startTunnel();
            }
        } catch (Exception e) {
            status.setText("VPN error: " + e.getMessage());
            status.setTextColor(0xFFFF7777);
        }
    }

    private void startTunnel() {
        try {
            backend.setState(tunnel, Tunnel.State.UP, config);
            showState(Tunnel.State.UP);
        } catch (Exception e) {
            status.setText("Connection failed: " + e.getMessage());
            status.setTextColor(0xFFFF7777);
        }
    }

    private void showState(Tunnel.State state) {
        boolean up = state == Tunnel.State.UP;
        status.setText(up ? "CONNECTED" : "DISCONNECTED");
        status.setTextColor(up ? 0xFF66E3A4 : 0xFFFFD166);
        connectButton.setText(up ? "DISCONNECT" : "CONNECT");
    }
}
