# Botnix WireGuard control API contract

The Supabase function `create-wireguard-peer` calls the HTTPS URL stored in
`BOTNIX_WG_API_URL`. It sends a POST request with a bearer token stored in
`BOTNIX_WG_API_TOKEN` and an `Idempotency-Key` equal to the peer UUID.

Request JSON:

```json
{
  "peer_id": "Supabase wireguard_peers.id",
  "customer_id": "Supabase customers.id",
  "public_key": "client WireGuard public key",
  "device_name": "Android device"
}
```

The Botnix service must validate the bearer token in constant time, validate the
public key, make the operation idempotent by peer_id, allocate a unique client
address from the VPN subnet, and add the peer to the existing `wg0` interface
using WireGuard tooling. It must not accept or log client private keys.

Successful response JSON:

```json
{
  "assigned_ip": "10.66.66.2/32",
  "server_public_key": "base64 WireGuard server public key",
  "endpoint": "vpn.example.com:51820",
  "allowed_ips": "0.0.0.0/0, ::/0",
  "dns": "1.1.1.1, 1.0.0.1",
  "persistent_keepalive": 25
}
```

The response must use the server's real public key and reachable endpoint. The
example address and hostname above are illustrative only. Do not return success
until `wg0` confirms the peer was added. Protect this API behind HTTPS (ideally
a private Cloudflare Tunnel) and never expose the bearer token to the Android app.

## Required Supabase Edge Function secrets

- `BOTNIX_WG_API_URL`: full HTTPS URL to the Botnix peer-provisioning endpoint.
- `BOTNIX_WG_API_TOKEN`: long random secret shared only by Supabase and Botnix.

The function also uses the project's existing `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets.

The Free plan is provisioned without a paid subscription row. Its device count
comes from the `free` plan record. The current Free daily allowance is 100 MiB
(104,857,600 bytes); enforcement still requires server-side traffic accounting
against WireGuard transfer counters.


## Botnix installation (Ubuntu 24.04)

Run on the VPN server as an administrator after confirming `wg0` is active:

```bash
sudo install -d -m 700 /etc/jb-pocket-vpn /opt/jb-pocket-vpn-wg-api /var/lib/jb-pocket-vpn
sudo install -m 750 server.py /opt/jb-pocket-vpn-wg-api/server.py
sudo install -m 644 jb-pocket-vpn-wg-api.service /etc/systemd/system/jb-pocket-vpn-wg-api.service
```

Create `/etc/jb-pocket-vpn/wg-api.env` with a newly generated random token
(the exact same value must be configured as the Supabase
`BOTNIX_WG_API_TOKEN` secret):

```ini
WG_API_TOKEN=REPLACE_WITH_A_LONG_RANDOM_SECRET
WG_API_PORT=8765
WG_INTERFACE=wg0
WG_SERVER_ENDPOINT=YOUR_REAL_VPN_HOSTNAME_OR_IP:51820
WG_CLIENT_SUBNET=10.66.66.0/24
WG_SERVER_IP=10.66.66.1
WG_PEER_DB=/var/lib/jb-pocket-vpn/peers.sqlite3
```

Protect the file and start the service:

```bash
sudo chmod 600 /etc/jb-pocket-vpn/wg-api.env
sudo systemctl daemon-reload
sudo systemctl enable --now jb-pocket-vpn-wg-api
sudo systemctl status jb-pocket-vpn-wg-api --no-pager
curl http://127.0.0.1:8765/health
```

Expose this loopback-only service through a **Cloudflare Tunnel** hostname
routed to `http://127.0.0.1:8765`. Do not open TCP/8765 to the public
internet and do not bind the Python service to a public interface. Then set
Supabase `BOTNIX_WG_API_URL` to
`https://YOUR_TUNNEL_HOSTNAME/v1/peers`.

The service persists each successfully-added peer with `wg-quick save wg0`.
Back up `/etc/wireguard/wg0.conf` and the SQLite peer registry before
upgrading or restoring the server. The endpoint and client subnet values must
match the real server configuration; the sample values are not proof of a
working public endpoint.

This bridge only provisions peers. A separate server-side usage collector and
traffic policy are still required to enforce the Free plan's daily 100 MiB cap.
