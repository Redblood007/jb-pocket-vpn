# PhonePe Standard Checkout V2 setup

This branch adds server-side PhonePe checkout creation, webhook authentication and independent order-status verification. It does not become live until the database migrations, Edge Functions, PhonePe merchant credentials and webhook are configured in the owner's Supabase/PhonePe accounts.

## Edge Function secrets

Set these as Supabase Edge Function secrets (never as VITE_ variables and never in Git):

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- APP_BASE_URL (HTTPS public website origin)
- PHONEPE_ENV (sandbox or production)
- PHONEPE_CLIENT_ID
- PHONEPE_CLIENT_SECRET
- PHONEPE_CLIENT_VERSION
- PHONEPE_WEBHOOK_USERNAME
- PHONEPE_WEBHOOK_PASSWORD

PhonePe credentials are issued in the PhonePe PG Business Dashboard. Start with sandbox credentials and complete UAT before production.

## Deploy

1. Apply Drizzle migrations in order, including 0001_billing_subscriptions.sql and 0002_phonepe_checkout.sql, to the linked Supabase database.
2. Deploy functions: create-phonepe-order, phonepe-webhook, phonepe-payment-status.
3. Configure PhonePe Developer Settings > Webhook using **SHA** authentication. Use the exact username/password configured above. Subscribe only to checkout.order.completed and checkout.order.failed. Refund-driven subscription revocation is not implemented yet; do not enable refund callbacks as an access-revocation workflow.
4. Set webhook URL to https://PROJECT_REF.supabase.co/functions/v1/phonepe-webhook.
5. Enable authenticated function calls for create-phonepe-order and phonepe-payment-status. The webhook function must be publicly reachable but protected by PhonePe SHA authentication.
6. Configure PHONEPE_ENV=sandbox and run UAT: successful, failed, pending, wrong amount, duplicate webhook and refund cases. Only after UAT sign-off switch to production credentials/environment.

## Client integration contract

After customer sign-in, call create-phonepe-order with { "planId": "<published plan UUID>" } and the user's Supabase access token. Open the returned checkoutUrl in a secure browser/custom tab. On return, call phonepe-payment-status with { "orderReference": "<returned orderReference>" }. The redirect is not proof of payment; the server checks PhonePe's order-status API and activates only when the amount and completed state match.

## Current limitations

- Customer login/signup screens and the Android PRO app are not included in this repository branch yet; the Edge Functions require an authenticated Supabase user.
- The current Android project files were not found at android-app/ in this branch. The existing website's plan buttons still point to WhatsApp until the signed-in customer checkout UI is connected.
- WireGuard peer provisioning/revocation is not implemented. Payment activation creates a subscription and activates the customer record, but a real tunnel peer still needs a server-side WireGuard control-plane worker and expiry/revocation job.
- Apply migrations and deploy functions in Supabase before testing. Do not describe this branch as live/production-ready until the complete web + Android + VPN server end-to-end tests pass.

## PhonePe API references

- Standard Checkout V2: https://developer.phonepe.com/phonepe-payment-gateway/pg-v2-standard-checkout-integration
- Authorization: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization
- Initiate Payment: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/initiate-payment
- Order Status: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status
- Webhook Handling: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook
