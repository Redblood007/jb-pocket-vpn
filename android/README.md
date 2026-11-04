# JB Pocket VPN Android

This is the native Android application module, separate from the existing web app.

## Current foundation

- Kotlin Android application, package `com.jb.pocketvpn`
- Android Gradle build configuration
- Official WireGuard Android tunnel library dependency:
  `com.wireguard.android:tunnel:1.0.20260102`
- GitHub Actions debug APK workflow

## Important status

The WireGuard library dependency is included, but the app does not yet start a tunnel. The next implementation tasks are:

1. Implement a WireGuard `Tunnel` adapter and `GoBackend` lifecycle.
2. Add Android VPN consent flow and required service declaration.
3. Obtain a per-user client configuration from an authenticated provisioning API.
4. Store client private keys only on-device using Android Keystore-backed protection where supported.
5. Add disconnect, state observation, error handling, and reconnect behavior.
6. Add server-side traffic accounting and daily quota enforcement before advertising a 100 MB limit.

Do not embed the server private key, a shared client private key, API secrets, or production credentials in this APK or repository.

## Build

From this directory, use Gradle 8.9 and JDK 17:

```sh
gradle assembleDebug
```

The GitHub Actions workflow builds and uploads a debug APK artifact for the `android-vpn-app` branch.
