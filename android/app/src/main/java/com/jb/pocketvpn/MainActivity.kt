package com.jb.pocketvpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.Color
import androidx.activity.result.contract.ActivityResultContracts
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import java.io.InputStream
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var backend: GoBackend
    private lateinit var status: TextView
    private lateinit var connectButton: Button
    private var tunnelConfig: Config? = null
    private var isUp = false

    private val pickConfig = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@registerForActivityResult
        try {
            contentResolver.openInputStream(uri)?.use { input ->
                tunnelConfig = Config.parse(input)
            } ?: error("Unable to open selected file")
            status.text = "WireGuard profile loaded. Ready to connect."
            connectButton.isEnabled = true
        } catch (e: Exception) {
            tunnelConfig = null
            connectButton.isEnabled = false
            status.text = "Could not read profile: ${e.message ?: "invalid config"}"
        }
    }

    private val vpnPermission = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        if (it.resultCode == RESULT_OK) startTunnel() else status.text = "Android VPN permission was not granted."
    }

    private val tunnel = object : Tunnel {
        override fun getName(): String = "jb-pocket-vpn"
        override fun onStateChange(newState: Tunnel.State) {
            runOnUiThread {
                isUp = newState == Tunnel.State.UP
                status.text = if (isUp) "VPN tunnel is ON" else "VPN tunnel is OFF"
                connectButton.text = if (isUp) "Disconnect" else "Connect"
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        backend = GoBackend(applicationContext)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 40, 32, 40)
            setBackgroundColor(Color.rgb(5, 11, 27))
        }
        val title = TextView(this).apply {
            text = "JB Pocket VPN"
            textSize = 30f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        status = TextView(this).apply {
            text = "Import a WireGuard client profile to begin.\nYour server private key must never be imported here."
            textSize = 16f
            setTextColor(Color.rgb(190, 205, 220))
            gravity = Gravity.CENTER
            setPadding(0, 28, 0, 24)
        }
        val importButton = Button(this).apply {
            text = "Import WireGuard profile"
            setOnClickListener { pickConfig.launch(arrayOf("application/octet-stream", "text/plain", "*/*")) }
        }
        connectButton = Button(this).apply {
            text = "Connect"
            isEnabled = false
            setOnClickListener {
                if (isUp) stopTunnel()
                else {
                    val permissionIntent = VpnService.prepare(this@MainActivity)
                    if (permissionIntent != null) vpnPermission.launch(permissionIntent) else startTunnel()
                }
            }
        }
        root.addView(title)
        root.addView(status)
        root.addView(importButton)
        root.addView(connectButton)
        setContentView(root)
    }

    private fun startTunnel() {
        val config = tunnelConfig ?: run {
            status.text = "Import a WireGuard profile first."
            return
        }
        connectButton.isEnabled = false
        status.text = "Starting secure VPN tunnel…"
        worker.execute {
            try {
                backend.setState(tunnel, Tunnel.State.UP, config)
            } catch (e: Exception) {
                runOnUiThread { status.text = "Connection failed: ${e.message ?: "unknown error"}" }
            } finally {
                runOnUiThread { connectButton.isEnabled = true }
            }
        }
    }

    private fun stopTunnel() {
        connectButton.isEnabled = false
        status.text = "Disconnecting…"
        worker.execute {
            try {
                backend.setState(tunnel, Tunnel.State.DOWN, null)
            } catch (e: Exception) {
                runOnUiThread { status.text = "Disconnect failed: ${e.message ?: "unknown error"}" }
            } finally {
                runOnUiThread { connectButton.isEnabled = true }
            }
        }
    }

    override fun onDestroy() {
        worker.shutdown()
        super.onDestroy()
    }
}
