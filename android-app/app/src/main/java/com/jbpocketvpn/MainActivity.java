package com.jbpocketvpn;

import android.app.Activity;
import android.content.Intent;
import android.net.VpnService;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

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
    private TextView profileStatus;
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

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radius));
        return drawable;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private LinearLayout.LayoutParams params(int width, int height) {
        return new LinearLayout.LayoutParams(width < 0 ? width : dp(width), height < 0 ? height : dp(height));
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(8, 14, 29));
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(0, bars.top, 0, bars.bottom);
            } else {
                view.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            }
            return insets;
        });

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(22), dp(28), dp(22), dp(28));
        scroll.addView(root);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        TextView logo = text("✦", 25, Color.rgb(83, 230, 160), true);
        logo.setGravity(Gravity.CENTER);
        logo.setBackground(rounded(Color.rgb(22, 43, 52), 14));
        header.addView(logo, params(48, 48));

        LinearLayout brand = new LinearLayout(this);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.setPadding(dp(12), 0, 0, 0);
        brand.addView(text("JB POCKET VPN", 18, Color.WHITE, true));
        brand.addView(text("PRIVATE • FAST • SECURE", 10, Color.rgb(143, 160, 184), true));
        header.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        TextView pro = text("PRO", 11, Color.rgb(83, 230, 160), true);
        pro.setPadding(dp(12), dp(7), dp(12), dp(7));
        pro.setBackground(rounded(Color.rgb(20, 49, 43), 20));
        header.addView(pro);
        root.addView(header, params(-1, 52));

        TextView headline = text("Your privacy,\nyour connection.", 30, Color.WHITE, true);
        headline.setLineSpacing(dp(3), 1f);
        LinearLayout.LayoutParams headlineParams = params(-1, -2);
        headlineParams.topMargin = dp(42);
        root.addView(headline, headlineParams);
        TextView description = text("Connect securely through your WireGuard VPN.", 14, Color.rgb(153, 168, 190), false);
        LinearLayout.LayoutParams descriptionParams = params(-1, -2);
        descriptionParams.topMargin = dp(10);
        root.addView(description, descriptionParams);

        LinearLayout statusCard = new LinearLayout(this);
        statusCard.setOrientation(LinearLayout.VERTICAL);
        statusCard.setPadding(dp(18), dp(18), dp(18), dp(18));
        statusCard.setBackground(rounded(Color.rgb(17, 27, 47), 20));
        LinearLayout.LayoutParams cardParams = params(-1, -2);
        cardParams.topMargin = dp(34);
        root.addView(statusCard, cardParams);

        TextView label = text("CONNECTION STATUS", 11, Color.rgb(143, 160, 184), true);
        statusCard.addView(label);
        status = text("DISCONNECTED", 21, Color.rgb(255, 203, 107), true);
        LinearLayout.LayoutParams statusParams = params(-1, -2);
        statusParams.topMargin = dp(10);
        statusCard.addView(status, statusParams);
        profileStatus = text("No WireGuard profile imported", 13, Color.rgb(153, 168, 190), false);
        LinearLayout.LayoutParams profileParams = params(-1, -2);
        profileParams.topMargin = dp(8);
        statusCard.addView(profileStatus, profileParams);

        connectButton = new Button(this);
        connectButton.setText("CONNECT");
        connectButton.setAllCaps(false);
        connectButton.setTextSize(17);
        connectButton.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        connectButton.setTextColor(Color.rgb(5, 25, 20));
        connectButton.setBackground(rounded(Color.rgb(83, 230, 160), 16));
        connectButton.setElevation(dp(3));
        LinearLayout.LayoutParams connectParams = params(-1, 58);
        connectParams.topMargin = dp(24);
        root.addView(connectButton, connectParams);
        connectButton.setOnClickListener(v -> toggleTunnel());

        Button importButton = new Button(this);
        importButton.setText("Import WireGuard profile");
        importButton.setAllCaps(false);
        importButton.setTextSize(14);
        importButton.setTextColor(Color.WHITE);
        importButton.setBackground(rounded(Color.rgb(28, 42, 66), 16));
        LinearLayout.LayoutParams importParams = params(-1, 52);
        importParams.topMargin = dp(12);
        root.addView(importButton, importParams);
        importButton.setOnClickListener(v -> openConfigPicker());

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.setPadding(dp(16), dp(16), dp(16), dp(16));
        info.setBackground(rounded(Color.rgb(13, 22, 39), 16));
        LinearLayout.LayoutParams infoParams = params(-1, -2);
        infoParams.topMargin = dp(28);
        root.addView(info, infoParams);
        info.addView(text("HOW TO CONNECT", 12, Color.rgb(83, 230, 160), true));
        TextView steps = text("1. Import your .conf file from WireGuard\n2. Tap Connect and approve Android VPN permission\n3. Tap Disconnect when you are finished", 13, Color.rgb(177, 190, 210), false);
        steps.setLineSpacing(dp(7), 1f);
        LinearLayout.LayoutParams stepsParams = params(-1, -2);
        stepsParams.topMargin = dp(12);
        info.addView(steps, stepsParams);

        TextView footer = text("WireGuard tunnel • Profile stays on this device", 11, Color.rgb(112, 130, 155), false);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footerParams = params(-1, -2);
        footerParams.topMargin = dp(28);
        root.addView(footer, footerParams);

        setContentView(scroll);
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
                profileStatus.setText("WireGuard profile imported • Ready to connect");
                profileStatus.setTextColor(Color.rgb(83, 230, 160));
                Toast.makeText(this, "WireGuard profile imported", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                config = null;
                profileStatus.setText("Could not read this config file");
                profileStatus.setTextColor(Color.rgb(255, 119, 119));
                Toast.makeText(this, "Invalid WireGuard config: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        } else if (requestCode == REQUEST_VPN_PERMISSION) {
            if (resultCode == RESULT_OK) startTunnel();
            else Toast.makeText(this, "VPN permission was not granted", Toast.LENGTH_LONG).show();
        }
    }

    private void toggleTunnel() {
        if (config == null) {
            Toast.makeText(this, "Import your WireGuard .conf file first.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            if (backend.getState(tunnel) == Tunnel.State.UP) {
                backend.setState(tunnel, Tunnel.State.DOWN, null);
                Tunnel.State actualState = backend.getState(tunnel);
                showState(actualState);
                if (actualState != Tunnel.State.DOWN) {
                    throw new IllegalStateException("WireGuard did not confirm disconnection");
                }
            } else {
                Intent permission = VpnService.prepare(this);
                if (permission != null) startActivityForResult(permission, REQUEST_VPN_PERMISSION);
                else startTunnel();
            }
        } catch (Exception e) {
            showConnectionError("VPN operation failed");
            Toast.makeText(this, safeErrorMessage(e), Toast.LENGTH_LONG).show();
        }
    }

    private void startTunnel() {
        if (config == null) {
            showConnectionError("WIREGUARD PROFILE REQUIRED");
            return;
        }
        try {
            backend.setState(tunnel, Tunnel.State.UP, config);
            Tunnel.State actualState = backend.getState(tunnel);
            showState(actualState);
            if (actualState != Tunnel.State.UP) {
                throw new IllegalStateException("WireGuard did not confirm the tunnel is up");
            }
        } catch (Exception e) {
            showConnectionError("CONNECTION FAILED");
            Toast.makeText(this, safeErrorMessage(e), Toast.LENGTH_LONG).show();
        }
    }

    private void showConnectionError(String message) {
        status.setText(message);
        status.setTextColor(Color.rgb(255, 119, 119));
        connectButton.setText("CONNECT");
    }

    private String safeErrorMessage(Exception error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
                ? error.getClass().getSimpleName()
                : message;
    }

    @Override protected void onResume() {
        super.onResume();
        if (backend != null && tunnel != null && status != null) {
            try {
                showState(backend.getState(tunnel));
            } catch (Exception e) {
                showConnectionError("STATUS UNAVAILABLE");
            }
        }
    }

    private void showState(Tunnel.State state) {
        boolean up = state == Tunnel.State.UP;
        status.setText(up ? "CONNECTED" : "DISCONNECTED");
        status.setTextColor(up ? Color.rgb(83, 230, 160) : Color.rgb(255, 203, 107));
        connectButton.setText(up ? "DISCONNECT" : "CONNECT");
    }
}
