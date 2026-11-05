#!/usr/bin/env python3
"""Private Botnix-side WireGuard peer provisioner. Bind only to loopback."""
from __future__ import annotations

import hmac
import ipaddress
import json
import os
import re
import sqlite3
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("WG_API_PORT", "8765"))
INTERFACE = os.environ.get("WG_INTERFACE", "wg0")
TOKEN = os.environ["WG_API_TOKEN"]
ENDPOINT = os.environ["WG_SERVER_ENDPOINT"]
SUBNET = ipaddress.ip_network(os.environ.get("WG_CLIENT_SUBNET", "10.66.66.0/24"))
SERVER_IP = ipaddress.ip_address(os.environ.get("WG_SERVER_IP", "10.66.66.1"))
DB_PATH = Path(os.environ.get("WG_PEER_DB", "/var/lib/jb-pocket-vpn/peers.sqlite3"))
PUBLIC_KEY_RE = re.compile(r"^[A-Za-z0-9+/]{43}=$")
ENDPOINT_RE = re.compile(r"^[A-Za-z0-9.-]+:\\d{1,5}$")

if not PUBLIC_KEY_RE.fullmatch(subprocess.run(
    ["wg", "show", INTERFACE, "public-key"], check=True, capture_output=True, text=True
).stdout.strip()):
    raise RuntimeError("Could not read a valid WireGuard server public key")
SERVER_PUBLIC_KEY = subprocess.run(
    ["wg", "show", INTERFACE, "public-key"], check=True, capture_output=True, text=True
).stdout.strip()
if not ENDPOINT_RE.fullmatch(ENDPOINT):
    raise RuntimeError("WG_SERVER_ENDPOINT must be hostname-or-ip:port")
if SERVER_IP not in SUBNET:
    raise RuntimeError("WG_SERVER_IP must be inside WG_CLIENT_SUBNET")

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
db = sqlite3.connect(DB_PATH, timeout=15, check_same_thread=False)
db.execute("PRAGMA journal_mode=WAL")
db.execute("""CREATE TABLE IF NOT EXISTS peers (
    peer_id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL UNIQUE,
    assigned_ip TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)""")
db.commit()
db_lock = threading.Lock()


def allocate_ip(connection: sqlite3.Connection) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    used = {row[0] for row in connection.execute("SELECT assigned_ip FROM peers")}
    for candidate in SUBNET.hosts():
        if candidate != SERVER_IP and str(candidate) not in used:
            return candidate
    raise RuntimeError("VPN address pool is full")


class Handler(BaseHTTPRequestHandler):
    server_version = "JB-Pocket-WG/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        # Avoid logging request headers or secrets.
        print("wg-api:", fmt % args)

    def reply(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/v1/peers":
            self.reply(404, {"error": "not_found"})
            return
        supplied = self.headers.get("Authorization", "")
        if not hmac.compare_digest(supplied, "Bearer " + TOKEN):
            self.reply(401, {"error": "unauthorized"})
            return
        if self.headers.get("Content-Length", "").isdigit() is False:
            self.reply(411, {"error": "content_length_required"})
            return
        length = int(self.headers["Content-Length"])
        if length < 2 or length > 4096:
            self.reply(413, {"error": "invalid_body_size"})
            return
        try:
            payload = json.loads(self.rfile.read(length))
            peer_id = payload.get("peer_id")
            public_key = payload.get("public_key")
            if not isinstance(peer_id, str) or not re.fullmatch(r"[0-9a-f-]{36}", peer_id):
                raise ValueError("invalid_peer_id")
            if not isinstance(public_key, str) or not PUBLIC_KEY_RE.fullmatch(public_key):
                raise ValueError("invalid_public_key")

            with db_lock, db:
                row = db.execute(
                    "SELECT public_key, assigned_ip FROM peers WHERE peer_id = ?", (peer_id,)
                ).fetchone()
                if row:
                    if row[0] != public_key:
                        raise ValueError("peer_id_key_mismatch")
                    assigned = ipaddress.ip_address(row[1])
                else:
                    collision = db.execute(
                        "SELECT peer_id FROM peers WHERE public_key = ?", (public_key,)
                    ).fetchone()
                    if collision:
                        raise ValueError("public_key_already_registered")
                    assigned = allocate_ip(db)
                    db.execute(
                        "INSERT INTO peers(peer_id, public_key, assigned_ip) VALUES (?, ?, ?)",
                        (peer_id, public_key, str(assigned)),
                    )

                subprocess.run(
                    ["wg", "set", INTERFACE, "peer", public_key, "allowed-ips", f"{assigned}/32"],
                    check=True, capture_output=True, text=True, timeout=10,
                )
                # Persist the live interface so the peer survives a reboot.
                subprocess.run(
                    ["wg-quick", "save", INTERFACE],
                    check=True, capture_output=True, text=True, timeout=15,
                )

            self.reply(200, {
                "assigned_ip": f"{assigned}/32",
                "server_public_key": SERVER_PUBLIC_KEY,
                "endpoint": ENDPOINT,
                "allowed_ips": "0.0.0.0/0, ::/0",
                "dns": "1.1.1.1, 1.0.0.1",
                "persistent_keepalive": 25,
            })
        except ValueError as exc:
            self.reply(400, {"error": str(exc)})
        except subprocess.CalledProcessError as exc:
            print("wg-api command failed:", exc.returncode, (exc.stderr or "")[:300])
            self.reply(502, {"error": "wireguard_command_failed"})
        except Exception as exc:
            print("wg-api provisioning failed:", type(exc).__name__)
            self.reply(500, {"error": "provisioning_failed"})

    def do_GET(self) -> None:
        if self.path == "/health":
            self.reply(200, {"ok": True, "interface": INTERFACE})
        else:
            self.reply(404, {"error": "not_found"})


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
