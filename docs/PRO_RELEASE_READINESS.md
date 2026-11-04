# JB Pocket VPN PRO — release readiness

## Added in the billing implementation branch

- Monthly and yearly plan records are included in the billing migration.
- Public pricing cards distinguish monthly from yearly billing.
- The existing admin area retains customer and plan management.
- The admin area now includes a recent payment-orders view.
- Payment order, subscription, webhook-event and WireGuard-peer tables are defined.
- `confirm_paid_order` is a service-role-only, idempotent activation function. It must only be called by trusted backend code after verifying the payment provider's signature, merchant, currency, amount and order reference.

## Not production-ready yet

This branch does not claim that live UPI payments or automatic WireGuard provisioning are operational. The payment provider webhook/checkout endpoint, secure order-creation endpoint, peer provisioning worker, subscription expiry/revocation worker and end-to-end tests still need to be implemented and deployed. A database schema by itself does not process payments or configure a VPN server.

## Owner/deployment requirements

Configure server-only secrets in the Supabase/Vercel project settings; never commit them or put them in `VITE_*` variables:

- `UPI_MERCHANT_VPA`
- `UPI_MERCHANT_NAME`
- `PAYMENT_PROVIDER` (`razorpay` or `phonepe` for automatic verification; manual mode requires audited bank reconciliation)
- Provider key ID, secret and webhook signing secret
- WireGuard server endpoint, server public key, interface and an authenticated provisioning mechanism

The merchant must complete gateway onboarding and configure the webhook URL. The VPN host must be reachable from the provisioning backend. Private WireGuard keys must remain server-side; the app must receive only its own client configuration after subscription activation.

## Required release tests

1. Apply the Supabase migration to a staging project.
2. Run typecheck, lint, unit tests and production web build.
3. Test monthly and yearly pricing, including server-calculated amounts.
4. Test valid, invalid-signature, wrong-amount, duplicate and replayed webhooks.
5. Confirm pending/expired/refunded orders never activate access.
6. Confirm a verified payment activates exactly one subscription and exactly one peer.
7. Confirm expiry/refund revokes the peer and blocks reconnection.
8. Build and install the Android APK; test VPN permission, tunnel routing, DNS leak handling, reconnect and subscription expiry.
9. Complete production signing and publish only after the end-to-end tests pass.

## Important

The seeded admin account in the original migration is a development bootstrap account. Change its password immediately after first login and replace/remove the seed credentials before production.
