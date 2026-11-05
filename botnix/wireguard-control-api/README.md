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
