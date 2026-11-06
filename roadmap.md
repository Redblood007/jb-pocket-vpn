# Roadmap

## Existing foundation
- [x] "100 MB free without login" — Free ₹0 plan on homepage; "Get Free 100 MB" opens a no-login name+phone form; requests land in admin panel as inactive customers
- [x] Add admin data-per-verified-ad and daily reward limits; keep rewards locked off pending VPN integration and ad verification.
- [x] Existing admin route, customer management, plan management, Supabase role-gating architecture, and reward settings panel.
- [x] Existing Android WireGuard MVP and Botnix peer provisioning source added to this repository; MVP still imports a profile manually.

## Owner-approved monetization choices
- [x] PhonePe Payment Gateway selected for subscription checkout.
- [x] Google AdMob selected for Android app ads.
- [x] Google AdSense selected for website ads.
- [x] Separate private admin website selected; reuse existing Supabase Auth and role authorization.
- [x] Detailed security and integration requirements recorded in docs/payments-ads-admin-integration.md.

## Implementation tasks
- [x] Add server-side PhonePe Standard Checkout order-creation scaffold (UAT/production host selection, authenticated customer, database-derived plan amount, pending order row, OAuth token, hosted checkout URL).\n- [ ] Deploy/configure the PhonePe order-creation function and test against merchant UAT credentials.\n- [ ] Replace manual UPI/UTR flow with the verified PhonePe checkout flow.
- [x] Add authenticated server-side PhonePe order-status verification and atomic, idempotent subscription activation; deploy `verify-phonepe-payment` with JWT verification enabled.\n- [ ] Confirm webhook authentication against the merchant dashboard configuration and connect it to the same activation routine.\n- [ ] Connect the website plan button and payment-return UI to order creation and status verification.
- [ ] Configure PhonePe UAT secrets in Supabase; production secrets only after UAT approval.
- [ ] Add admin payments, refunds, reconciliation, and revenue reporting modules.
- [ ] Add AdMob SDK using test ad units; configure production IDs after AdMob app registration.
- [ ] Implement and verify AdMob rewarded-ad server-side verification (SSV), signature validation, replay protection, and daily reward caps before enabling rewards.
- [ ] Add AdSense publisher integration and ads.txt after domain ownership and publisher ID are supplied and Google approves the site.
- [ ] Deploy existing admin app on a dedicated admin hostname and verify server-side role protection.
- [ ] Complete automatic Android authentication and WireGuard peer provisioning; enforce paid-plan entitlements and Free quota in the VPN data plane.
- [ ] Run payment, webhook, ad SSV, DNS/routing, leak, reconnect, expiry, and Android real-device tests before production release.

## Production blockers
- [ ] PhonePe merchant account enabled and UAT/production credentials supplied by owner.
- [ ] Production website domain and admin hostname supplied/configured.
- [ ] AdMob App ID and ad-unit IDs supplied by owner.
- [ ] AdSense publisher ID supplied and site approved by Google.
- [ ] Supabase Edge Function secrets configured without committing secrets to Git.
- [ ] Signed Android release keystore configured as GitHub Actions secrets.
