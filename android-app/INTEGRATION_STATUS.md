# JB Pocket VPN Android integration status

This branch adds the previously separate native Android WireGuard MVP and its server-side peer provisioning components to the current website repository without replacing the web application.

## Verified in GitHub Actions
- The native Android app compiles with JDK 17 and Gradle 8.9.
- The build uses the official WireGuard tunnel library and Android VPN permission flow.
- The app imports a WireGuard client .conf file locally, then connects/disconnects through WireGuard GoBackend.
- The CI workflow uploads a debug APK artifact.
- The Botnix peer API Python source passes py_compile and its installer passes bash -n.
- The Supabase Edge Function passes Deno lint and type checking.

## Not yet production-complete
- The Android MVP currently imports an existing WireGuard profile; it does not yet automatically authenticate, provision a peer, and install the generated profile.
- The Botnix API requires a real, running WireGuard server, real public endpoint, and HTTPS Cloudflare Tunnel. Sample values are not operational configuration.
- The current Botnix API provisions peers but does not enforce the Free daily 100 MB quota. The database usage table alone does not enforce a limit.
- The Edge Function requires BOTNIX_WG_API_URL and BOTNIX_WG_API_TOKEN secrets to be configured in the matching Supabase project.
- Signed release builds require VPN_RELEASE_KEYSTORE_BASE64, VPN_RELEASE_STORE_PASSWORD, VPN_RELEASE_KEY_ALIAS, and VPN_RELEASE_KEY_PASSWORD GitHub Actions secrets.
- End-to-end DNS, routing, leak, reconnect, and device tests require a real Android device and live server.

Do not distribute the debug APK as a production release.
