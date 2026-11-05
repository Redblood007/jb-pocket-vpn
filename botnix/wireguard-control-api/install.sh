#!/usr/bin/env bash
set -euo pipefail

# Install the private peer-provisioning API on Ubuntu 24.04.
# Usage: sudo bash install.sh vpn.example.com:51820

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo: sudo bash install.sh YOUR_VPN_HOSTNAME:51820" >&2
  exit 1
fi
if [[ $# -ne 1 ]]; then
  echo "Usage: sudo bash install.sh YOUR_VPN_HOSTNAME:51820" >&2
  exit 1
fi
endpoint="$1"
if [[ ! "$endpoint" =~ ^[A-Za-z0-9.-]+:[0-9]{1,5}$ ]]; then
  echo "Invalid endpoint. Use hostname-or-ip:port, e.g. vpn.example.com:51820" >&2
  exit 1
fi
if ! command -v wg >/dev/null 2>&1 || ! command -v wg-quick >/dev/null 2>&1; then
  echo "WireGuard tools are missing. Install wireguard-tools first." >&2
  exit 1
fi
if ! wg show wg0 >/dev/null 2>&1; then
  echo "wg0 is not active. Start and verify the existing WireGuard server first." >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required." >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
install -d -m 700 /etc/jb-pocket-vpn /opt/jb-pocket-vpn-wg-api /var/lib/jb-pocket-vpn
install -m 750 "$script_dir/server.py" /opt/jb-pocket-vpn-wg-api/server.py
install -m 644 "$script_dir/jb-pocket-vpn-wg-api.service" /etc/systemd/system/jb-pocket-vpn-wg-api.service

token="$(openssl rand -hex 32)"
cat > /etc/jb-pocket-vpn/wg-api.env <<EOF
WG_API_TOKEN=$token
WG_API_PORT=8765
WG_INTERFACE=wg0
WG_SERVER_ENDPOINT=$endpoint
WG_CLIENT_SUBNET=10.66.66.0/24
WG_SERVER_IP=10.66.66.1
WG_PEER_DB=/var/lib/jb-pocket-vpn/peers.sqlite3
EOF
chmod 600 /etc/jb-pocket-vpn/wg-api.env

# Keep a root-only copy for transferring to Supabase secrets.
umask 077
printf '%s\n' "$token" > /root/jb-pocket-vpn-botnix-token.txt
unset token

systemctl daemon-reload
systemctl enable --now jb-pocket-vpn-wg-api
sleep 1
if ! systemctl is-active --quiet jb-pocket-vpn-wg-api; then
  systemctl status jb-pocket-vpn-wg-api --no-pager || true
  journalctl -u jb-pocket-vpn-wg-api -n 50 --no-pager || true
  exit 1
fi
if ! curl --fail --silent http://127.0.0.1:8765/health; then
  echo "Service started but health check failed." >&2
  exit 1
fi

echo
echo "Botnix API installed and healthy on loopback port 8765."
echo "Token saved at /root/jb-pocket-vpn-botnix-token.txt (root-only)."
echo "Next: create a Cloudflare Tunnel route to http://127.0.0.1:8765."
echo "Then set Supabase secrets BOTNIX_WG_API_URL=https://YOUR_TUNNEL_HOST/v1/peers"
echo "and BOTNIX_WG_API_TOKEN using the token file. Never put this token in Android."
