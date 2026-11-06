# PhonePe checkout backend scaffold

Committed 2026-11-07. Added `supabase/functions/create-phonepe-order/index.ts`.

The function:
- Authenticates the Supabase user with `auth.getUser()`.
- Reads the selected plan price and duration from the database; it does not trust a client-supplied amount.
- Resolves or creates the authenticated customer's row.
- Creates a pending `payment_orders` record using provider `phonepe`.
- Obtains a PhonePe OAuth token and starts Standard Checkout.
- Returns the hosted checkout URL and merchant order reference only.
- Supports UAT and production hosts selected by `PHONEPE_ENV`.

Required Edge Function secrets:
- `PHONEPE_ENV=UAT` (use PRODUCTION only after UAT sign-off)
- `PHONEPE_CLIENT_ID`
- `PHONEPE_CLIENT_SECRET`
- `PHONEPE_CLIENT_VERSION`
- `APP_ORIGIN` (exact HTTPS origin, no trailing slash)
- Supabase platform secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Not live yet
The function is committed to GitHub but is not deployed or configured. No payment is accepted by this code until it is deployed and tested against the merchant's PhonePe UAT account.

## Remaining before launch
1. Add PhonePe order-status verification.
2. Add webhook authentication matching the method selected in the PhonePe merchant dashboard (HMAC or SHA username/password).
3. Make payment finalization atomic and idempotent: verify merchant order ID, provider order ID, amount, INR currency and completed state; then create/extend the subscription exactly once.
4. Add payment return/status UI and connect the plan button to this function.
5. Add admin payment/refund/reconciliation reporting.
6. Run PhonePe UAT test cases before production.

The current PhonePe Standard Checkout documentation specifies OAuth token creation, checkout creation with amount in paise, order-status polling, and authenticated webhook handling. See https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization, https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment, https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status, and https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook.
