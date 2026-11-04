# JB Pocket VPN — Android MVP

This is a native Android shell using the official WireGuard tunnel library.

## Build
Run from this directory with JDK 17 and Android SDK installed:
`gradle assembleDebug`

GitHub Actions builds a debug APK and uploads it as an artifact.

## First connection
1. In the official WireGuard app, open your existing tunnel.
2. Use the tunnel menu to export its configuration to a local file. The file contains a private key: keep it private and do not upload it to GitHub or send it in chat.
3. Open JB Pocket VPN, tap **IMPORT WIREGUARD CONFIG**, and select that file.
4. Tap **CONNECT** and approve Android's VPN permission prompt.

The app imports the config locally. It does not contain a hard-coded client private key, and no VPN credentials are stored in this repository.

## Current MVP limits
- One imported WireGuard profile; no automatic customer provisioning or subscription checks yet.
- Debug APK only; release signing requires a private signing key stored as GitHub Actions secrets.
- Server-side NAT/routing must be verified separately before claiming all internet traffic exits through the VPN server.
