package com.redblood.pocketvpn

import android.app.Activity
import android.app.AlertDialog
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.content.Intent
import android.net.VpnService
import android.net.Uri
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import java.util.concurrent.Executors
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : Activity() {
    private val bg = Color.rgb(8, 15, 29)
    private val panel = Color.rgb(17, 28, 47)
    private val muted = Color.rgb(151, 166, 188)
    private val accent = Color.rgb(75, 231, 174)
    private lateinit var status: TextView
    private lateinit var serverValue: TextView
    private var selectedServer = "Auto · Best location"
    private var wireGuardConfig: Config? = null
    private var wireGuardBackend: GoBackend? = null
    private val vpnExecutor = Executors.newSingleThreadExecutor()
    private val wireGuardTunnel = object : Tunnel {
        override fun getName(): String = "jb-pocket-vpn"
        override fun onStateChange(newState: Tunnel.State) {
            runOnUiThread {
                status.text = if (newState == Tunnel.State.UP) "Connected" else "Not connected"
            }
        }
    }
    private val configPickerRequest = 4101
    private val vpnPermissionRequest = 4102

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        window.decorView.systemUiVisibility = 0
        setContentView(buildScreen())
    }

    private fun buildScreen(): View {
        val scroll = ScrollView(this).apply { setBackgroundColor(bg); isFillViewport = true }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(22), dp(22), dp(28))
        }
        scroll.addView(root)
        ViewCompat.setOnApplyWindowInsetsListener(scroll) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(0, bars.top, 0, bars.bottom)
            insets
        }
        ViewCompat.requestApplyInsets(scroll)

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val brand = column()
        brand.addView(label("JB POCKET VPN", 12f, accent, true))
        brand.addView(label("PRO", 25f, Color.WHITE, true))
        header.addView(brand, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(pill("PREMIUM", accent))
        root.addView(header)
        root.addView(space(24))

        root.addView(label("Your privacy,\n under your control.", 30f, Color.WHITE, true))
        root.addView(space(8))
        root.addView(label("VPN dashboard preview. A real encrypted tunnel is not active yet.", 14f, muted, false))
        root.addView(space(24))

        val hero = card()
        hero.gravity = Gravity.CENTER
        hero.setPadding(dp(18), dp(22), dp(18), dp(22))
        hero.addView(label("CONNECTION STATUS", 11f, muted, true))
        hero.addView(space(14))
        val orb = TextView(this).apply {
            text = "✦"
            textSize = 34f
            gravity = Gravity.CENTER
            setTextColor(accent)
            background = shape(Color.rgb(24, 62, 65), 100)
        }
        hero.addView(orb, LinearLayout.LayoutParams(dp(82), dp(82)))
        hero.addView(space(14))
        status = label("Not connected", 22f, Color.WHITE, true)
        hero.addView(status)
        hero.addView(space(6))
        hero.addView(label("VPN is not connected; traffic is not protected", 13f, muted, false))
        hero.addView(space(18))
        val connect = actionButton("CONNECT")
        connect.setOnClickListener { toggleVpn() }
        val importConfig = actionButton("IMPORT WIREGUARD CONFIG")
        importConfig.setTextColor(Color.WHITE)
        importConfig.background = shape(Color.rgb(35, 54, 76), 18)
        importConfig.setOnClickListener { openConfigPicker() }
        hero.addView(importConfig, LinearLayout.LayoutParams(-1, dp(48)).apply { topMargin = dp(10) })
        hero.addView(connect, LinearLayout.LayoutParams(-1, dp(54)))
        root.addView(hero)
        root.addView(space(18))

        root.addView(sectionTitle("SERVER LOCATION", "Choose"))
        root.addView(space(10))
        val server = card()
        server.orientation = LinearLayout.HORIZONTAL
        server.gravity = Gravity.CENTER_VERTICAL
        server.setPadding(dp(16), dp(16), dp(16), dp(16))
        val serverInfo = column()
        serverInfo.addView(label("⌖  Selected location", 12f, muted, false))
        serverValue = label(selectedServer, 16f, Color.WHITE, true)
        serverInfo.addView(space(5))
        serverInfo.addView(serverValue)
        server.addView(serverInfo, LinearLayout.LayoutParams(0, -2, 1f))
        val choose = TextView(this).apply { text = "CHANGE  ›"; textSize = 12f; typeface = Typeface.DEFAULT_BOLD; setTextColor(accent) }
        server.addView(choose)
        server.setOnClickListener { chooseServer() }
        root.addView(server)
        root.addView(space(18))

        root.addView(sectionTitle("YOUR SECURITY", ""))
        root.addView(space(10))
        val security = card()
        security.addView(featureRow("◈", "WireGuard tunnel", "Not configured in this dashboard build"))
        security.addView(separator())
        security.addView(featureRow("◎", "No activity tracking", "Privacy-first app design"))
        security.addView(separator())
        security.addView(featureRow("⌁", "Traffic protection", "Not active in this dashboard build"))
        root.addView(security)
        root.addView(space(18))

        root.addView(sectionTitle("QUICK SETTINGS", ""))
        root.addView(space(10))
        val settings = card()
        settings.addView(featureRow("⚙", "App preferences", "More controls coming soon"))
        settings.addView(separator())
        settings.addView(featureRow("ⓘ", "About JB Pocket VPN", "Version 1.1 Pro UI"))
        root.addView(settings)
        root.addView(space(20))
        root.addView(label("JB POCKET VPN  •  BUILT FOR YOUR PRIVACY", 10f, muted, true).apply { gravity = Gravity.CENTER })
        return scroll
    }


    private fun toggleVpn() {
        val backend = wireGuardBackend
        if (backend != null && wireGuardConfig != null) {
            vpnExecutor.execute {
                try {
                    if (backend.getState(wireGuardTunnel) == Tunnel.State.UP) {
                        backend.setState(wireGuardTunnel, Tunnel.State.DOWN, null)
                    } else {
                        requestVpnPermissionAndStart()
                    }
                } catch (e: Exception) {
                    runOnUiThread { showVpnError(e) }
                }
            }
            return
        }
        if (wireGuardConfig == null) {
            AlertDialog.Builder(this)
                .setTitle("WireGuard configuration needed")
                .setMessage("Import the client .conf file created for your JB Pocket VPN server. The configuration contains private credentials and stays inside this app.")
                .setPositiveButton("IMPORT") { _, _ -> openConfigPicker() }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun openConfigPicker() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        startActivityForResult(intent, configPickerRequest)
    }

    @Deprecated("Legacy result API used for broad Android compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != Activity.RESULT_OK || data?.data == null) return
        if (requestCode == configPickerRequest) {
            val uri: Uri = data.data!!
            vpnExecutor.execute {
                try {
                    val parsed = contentResolver.openInputStream(uri)?.use { Config.parse(it) }
                        ?: throw IllegalStateException("Could not open the selected configuration file")
                    if (parsed.peers.isEmpty()) throw IllegalArgumentException("The configuration has no WireGuard peer")
                    wireGuardConfig = parsed
                    wireGuardBackend = GoBackend(applicationContext)
                    runOnUiThread {
                        status.text = "Configuration imported"
                        AlertDialog.Builder(this)
                            .setTitle("Configuration imported")
                            .setMessage("Your WireGuard client configuration is loaded. Tap CONNECT to request Android VPN permission and start the tunnel.")
                            .setPositiveButton("OK", null)
                            .show()
                    }
                } catch (e: Exception) {
                    runOnUiThread { showVpnError(e) }
                }
            }
        } else if (requestCode == vpnPermissionRequest) {
            if (resultCode == Activity.RESULT_OK) startWireGuardTunnel()
            else runOnUiThread { status.text = "VPN permission not granted" }
        }
    }

    private fun requestVpnPermissionAndStart() {
        val permissionIntent = VpnService.prepare(this)
        if (permissionIntent != null) {
            runOnUiThread { startActivityForResult(permissionIntent, vpnPermissionRequest) }
        } else {
            startWireGuardTunnel()
        }
    }

    private fun startWireGuardTunnel() {
        val config = wireGuardConfig ?: return
        vpnExecutor.execute {
            try {
                val backend = wireGuardBackend ?: GoBackend(applicationContext).also { wireGuardBackend = it }
                backend.setState(wireGuardTunnel, Tunnel.State.UP, config)
            } catch (e: Exception) {
                runOnUiThread { showVpnError(e) }
            }
        }
    }

    private fun showVpnError(error: Exception) {
        status.text = "Connection failed"
        AlertDialog.Builder(this)
            .setTitle("VPN connection failed")
            .setMessage(error.message ?: "Check the imported WireGuard configuration and server availability.")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun chooseServer() {
        val locations = arrayOf("Auto · Best location", "India · Coming soon", "Singapore · Coming soon", "United States · Coming soon", "United Kingdom · Coming soon")
        AlertDialog.Builder(this)
            .setTitle("Choose server location")
            .setItems(locations) { _, which ->
                selectedServer = locations[which]
                serverValue.text = selectedServer
                if (which != 0) AlertDialog.Builder(this)
                    .setMessage("This location is a preview only. A live VPN server and WireGuard configuration must be added before it can connect.")
                    .setPositiveButton("OK", null).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showSetupNotice() {
        AlertDialog.Builder(this)
            .setTitle("VPN server setup required")
            .setMessage("The Pro interface is ready, but a real encrypted VPN connection is not configured yet. Add a WireGuard server endpoint and client configuration before enabling CONNECT. This demo will not claim to protect your traffic.")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun sectionTitle(title: String, action: String): View {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        row.addView(label(title, 12f, muted, true), LinearLayout.LayoutParams(0, -2, 1f))
        if (action.isNotEmpty()) row.addView(label(action, 12f, accent, true))
        return row
    }

    private fun featureRow(icon: String, title: String, detail: String): View {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(7), 0, dp(7)) }
        val symbol = TextView(this).apply { text = icon; textSize = 20f; gravity = Gravity.CENTER; setTextColor(accent); background = shape(Color.rgb(26, 48, 61), 14) }
        row.addView(symbol, LinearLayout.LayoutParams(dp(42), dp(42)))
        val texts = column().apply { setPadding(dp(12), 0, 0, 0) }
        texts.addView(label(title, 14f, Color.WHITE, true))
        texts.addView(space(4))
        texts.addView(label(detail, 11f, muted, false))
        row.addView(texts)
        return row
    }

    private fun actionButton(text: String): TextView = TextView(this).apply {
        this.text = text
        textSize = 14f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(Color.rgb(5, 25, 27))
        background = shape(accent, 18)
    }

    private fun pill(text: String, color: Int): TextView = TextView(this).apply {
        this.text = text
        textSize = 10f
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(color)
        gravity = Gravity.CENTER
        setPadding(dp(12), dp(8), dp(12), dp(8))
        background = shape(Color.rgb(24, 54, 57), 30)
    }

    private fun card(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(14), dp(16), dp(14))
        background = shape(panel, 22)
    }

    private fun column() = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    private fun label(text: String, size: Float, color: Int, bold: Boolean) = TextView(this).apply {
        this.text = text
        textSize = size
        setTextColor(color)
        if (bold) typeface = Typeface.DEFAULT_BOLD
    }
    private fun separator() = View(this).apply {
        setBackgroundColor(Color.rgb(37, 51, 71))
        layoutParams = LinearLayout.LayoutParams(-1, dp(1)).apply { topMargin = dp(7); bottomMargin = dp(7) }
    }
    private fun space(height: Int) = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(height)) }
    private fun shape(color: Int, radius: Int) = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat() }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
