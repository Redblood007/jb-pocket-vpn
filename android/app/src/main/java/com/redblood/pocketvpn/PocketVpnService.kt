package com.redblood.pocketvpn

import android.net.VpnService
import android.os.ParcelFileDescriptor

class PocketVpnService : VpnService() {
    private var iface: ParcelFileDescriptor? = null
    override fun onStartCommand(intent: android.content.Intent?, flags: Int, startId: Int): Int {
        iface?.close()
        iface = Builder().setSession("JB Pocket VPN Pro").setMtu(1500).addAddress("10.8.0.2", 32).establish()
        return START_STICKY
    }
    override fun onDestroy() { iface?.close(); iface = null; super.onDestroy() }
}
