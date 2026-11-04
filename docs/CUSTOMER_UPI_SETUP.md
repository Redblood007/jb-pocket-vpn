# Customer login and UPI checkout setup

## Included in this branch

- Customer email registration and sign-in using Supabase Auth.
- A plan checkout page that creates a server-side pending order.
- UPI intent handoff to the configured merchant VPA.
- An admin Payments tab for manually reviewing pending orders.

## Required Supabase setup

1. Open the Supabase project linked to this app.
2. Open **SQL Editor** and run the complete file:
   `drizzle/migrations/0001_customer_accounts_upi_orders.sql`
3. In **Authentication → Providers → Email**, enable email/password sign-up and configure the confirmation email settings you want.
4. Confirm the public plans and their prices in the Plans admin tab before accepting payments.

## Important payment limitation

The current UPI integration opens a UPI payment intent and records an order as **pending**. A successful return from Google Pay, PhonePe, Paytm or another UPI app is not proof of settlement. The admin must verify the matching transaction in the merchant bank/UPI statement before pressing **Confirm paid**.

Automatic verification is not enabled yet. It requires a merchant payment gateway/provider account that supports server-side payment verification and signed webhooks, plus its secret credentials stored in server environment variables. Never put gateway secrets in the Android app or browser code.

Marking an order paid does not yet provision a WireGuard peer or activate a VPN subscription. Server-side peer provisioning, subscription expiry enforcement, and the signed production APK remain separate tasks.
