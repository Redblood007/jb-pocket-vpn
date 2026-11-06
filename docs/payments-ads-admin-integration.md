# JK Pocket VPN — Payments, Ads & Admin Integration

## Approved product decisions
- Payment provider: PhonePe Payment Gateway (Standard Checkout).
- Mobile advertising: Google AdMob.
- Website advertising: Google AdSense, only after publisher/site approval.
- Administration: a separate private admin web entry point, using the existing Supabase Auth and server-side role checks.
- Existing application, Android WireGuard MVP, Supabase schema/functions, and Botnix VPN service must be extended in place. Do not replace the existing project.

## Current repository findings (2026-11-07)
- The website currently offers manual UPI instructions and UTR submission. This is not an integrated PhonePe PG checkout and must not be represented as automated payment verification.
- An admin route and role-check architecture already exist. Keep admin access restricted to the server-verified user_roles/has_role authorization path; do not rely on hidden links or client-only checks.
- The Android app is an MVP that imports a WireGuard profile. It does not yet automatically authenticate, provision a peer, or enforce subscriptions end-to-end.
- Reward settings are deliberately locked off until VPN provisioning and ad verification are implemented. Preserve this fail-closed behavior.
- Free plan daily quota is described in product copy but is not yet enforced by the VPN data plane.

## PhonePe Payment Gateway implementation requirements
1. Use PhonePe Standard Checkout from a trusted server-side function. The browser/mobile app must never receive merchant secrets, salt keys, client secrets, or webhook credentials.
2. Create a pending payment/order row server-side using the plan price read from the database. Never accept amount, currency, plan price, customer id, or subscription duration as trusted client input.
3. Generate a unique merchant order id and use idempotency protections. Persist the provider order reference and status.
4. Return only the hosted checkout URL/redirect information needed by the client.
5. Verify payment status with PhonePe server-to-server status API and verify webhook authentication/signature using the current PhonePe documentation before marking an order paid.
6. Process duplicate/retried webhooks idempotently. A client redirect or client success callback must never activate a subscription.
7. Activate/extend a subscription only after a verified successful provider status and matching order amount, currency, merchant order id, and customer.
8. Add refund/reconciliation visibility to admin. Never store raw card/UPI credentials.
9. Configure PhonePe UAT credentials and production credentials as separate server-side secrets. Test UAT before production enablement.

Required server secrets (names are placeholders until matching PhonePe account credentials are supplied):
- PHONEPE_ENV (UAT or PRODUCTION)
- PHONEPE_CLIENT_ID
- PHONEPE_CLIENT_SECRET
- PHONEPE_CLIENT_VERSION
- PHONEPE_MERCHANT_ID (only if required by the enabled PhonePe product/version)
- PHONEPE_WEBHOOK_USERNAME / PHONEPE_WEBHOOK_PASSWORD (only if configured for the merchant's webhook scheme)

Do not commit credentials to GitHub or put them in VITE_/NEXT_PUBLIC_ variables.

## AdMob implementation requirements
- Add the official Google Mobile Ads SDK to the Android app with test ad unit IDs during development.
- Replace test IDs only after the app is registered in the owner's AdMob account and app/ad-unit IDs are supplied.
- Rewarded ads must use server-side verification (SSV), signature/key verification, transaction-id deduplication, and per-user/day limits.
- Do not credit data, time, coins, or premium access from a client-only callback.
- Keep rewards disabled until SSV is deployed and tested. Respect ad network policies; never ask users to click ads.

## AdSense website requirements
- Add publisher code and ads.txt only after the owner supplies the publisher ID and the production website/domain is ready.
- The site must be reviewed/approved by Google before expecting ads or revenue.
- Do not display placeholder or fabricated ad earnings. Report only actual provider-reported revenue or explicitly labelled estimates.

## Separate admin website requirements
- Deploy the existing authenticated admin application on a dedicated admin hostname/domain when DNS and hosting are configured (for example, admin subdomain); do not create a second database or duplicate admin identity store.
- Require Supabase Auth plus server-side role verification on every privileged action.
- Admin modules: overview, users, plans, orders/payments, refunds, ad/reward settings, ad revenue reporting, VPN peers/servers, audit log, and settings.
- Never expose private WireGuard keys, provider secrets, or Supabase service-role keys in the admin browser.
- Revenue dashboard must distinguish PhonePe gross successful payments, refunds, net receipts, and AdMob/AdSense reported earnings. Do not combine currencies without an explicit FX source.

## Launch blockers / owner inputs
- PhonePe merchant account must be enabled for the required PG product; obtain UAT and production credentials in PhonePe dashboard.
- Owner must provide the production website domain and admin hostname.
- Owner must register the Android app and ad units in AdMob, then supply App ID/ad unit IDs.
- Owner must provide AdSense publisher ID and receive site approval.
- Configure the secrets in Supabase Edge Function secrets (not in Git).
- Complete Android real-device tunnel, DNS, routing, leak, reconnect, payment, webhook, ad SSV, and subscription expiry tests before release.

## Implementation status
This document records the approved design and the existing gaps. It does not claim PhonePe, AdMob, AdSense, or production revenue is live until credentials, provider approval, deployment, and end-to-end tests are complete.
