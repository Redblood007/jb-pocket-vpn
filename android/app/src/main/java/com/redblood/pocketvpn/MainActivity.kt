package com.redblood.pocketvpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48,72,48,48) }
        val title = TextView(this).apply { text = "JB Pocket VPN Pro"; textSize = 28f }
        val subtitle = TextView(this).apply { text = "Premium VPN • No ads • Secure connection"; textSize = 16f; setPadding(0,16,0,48) }
        status = TextView(this).apply { text = "Ready to connect"; textSize = 18f; setPadding(0,24,0,24) }
        val connect = Button(this).apply { text = "CONNECT"; setOnClickListener { requestVpnPermission() } }
        root.addView(title); root.addView(subtitle); root.addView(status); root.addView(connect)
        setContentView(root)
    }
    private fun requestVpnPermission() {
        val intent = VpnService.prepare(this)
        if (intent != null) startActivityForResult(intent, 100) else startVpn()
    }
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) { super.onActivityResult(requestCode,resultCode,data); if (requestCode == 100 && resultCode == RESULT_OK) startVpn() }
    private fun startVpn() { startService(Intent(this, PocketVpnService::class.java)); status.text = "VPN service started" }
}
