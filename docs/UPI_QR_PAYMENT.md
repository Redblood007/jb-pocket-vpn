# JB VPN Pro — UPI QR checkout integration

This branch prepares the existing repository for a UPI QR checkout. It deliberately does **not** mark a payment as successful from a QR scan, UPI-app return URL, screenshot, or user-entered UTR.

## Payment flow

1. An authenticated customer selects a published VPN plan.
2. The server creates a unique pending order and calculates the amount from the plan stored in the database (never from a client-supplied amount).
3. The checkout displays a QR code and a `upi://pay` intent for the configured merchant VPA, with the exact amount and order reference.
4. The customer pays in their UPI app and returns to the app.
5. The order remains **pending** until either:
   - a payment provider's signed webhook confirms the captured payment and the server verifies amount, currency, merchant/order reference and provider payment ID; or
   - an admin independently reconciles the bank/UPI statement and approves the order.
6. Only the verified/approved order can activate a subscription. Activation and WireGuard peer provisioning must be idempotent. Refunds, duplicate webhooks and expired orders must not create duplicate access.

## Required merchant configuration

Do not commit credentials or personal payment secrets. Configure these as deployment environment variables / protected GitHub or hosting secrets:

- `UPI_MERCHANT_VPA` — merchant VPA, e.g. `merchant@bank` (replace with the owner's actual VPA).
- `UPI_MERCHANT_NAME` — exact merchant display name.
- `PAYMENT_PROVIDER` — `manual`, `razorpay`, or `phonepe`.
- For gateway mode, use the provider's server-side key ID, key secret and webhook signing secret in protected server-only secrets. Never expose them through `VITE_*` variables or ship them in the Android APK.

The repository owner must supply/confirm the merchant VPA and complete merchant onboarding with the selected provider before live payments can be enabled. A personal static QR can accept transfers, but it does not provide trusted automatic payment verification.

## Security and acceptance checks

- QR payload amount and order reference are generated on the server from the selected plan and pending order.
- Validate the VPA and escape/encode all UPI URI fields.
- Do not trust client redirects, screenshots, UTR text, or a client-side "Payment successful" button.
- Verify webhook signatures against the raw request body; reject invalid signatures and replayed events.
- Enforce unique provider event/payment IDs and idempotent order transitions.
- Keep gateway secrets server-side; apply RLS/authorization to payment orders and admin actions.
- Expire unpaid orders; audit admin approvals and subscription/peer changes.
- Test exact amount, wrong amount, duplicate webhook, invalid signature, abandoned checkout, refund, and expiry before production.

## Current integration status

This document is a setup/implementation contract, not proof that live QR payments are enabled. The existing repository's UPI checkout foundation describes UPI intent handoff and pending payment orders, with manual admin review; automatic gateway verification and WireGuard peer provisioning are separate required steps. Do not advertise instant VPN activation until those server-side steps are implemented and tested.

## Owner action needed

Confirm the merchant VPA and whether the project will use a gateway (Razorpay/PhonePe) or manual bank-statement reconciliation. Do not send UPI PINs, OTPs, API secrets, or private keys in chat or commit them to Git.
