# Manual UPI checkout (JB Pocket VPN PRO)

This branch implements the server-side foundation for direct UPI payments to the owner's VPA. It does not use PhonePe Payment Gateway APIs.

## Merchant details
- VPA: `javaidbeigh121@okaxis`
- Payee display name: `Javaid Beigh`
- Configure `UPI_MERCHANT_VPA` and `UPI_MERCHANT_NAME` as Supabase Edge Function secrets. Do not hardcode credentials in the app.

## Intended customer flow
1. Customer signs in and selects a published monthly or yearly plan.
2. The server reads the plan price from the database and creates a pending manual payment order.
3. The app opens the returned `upi://pay` intent with the exact amount and unique order reference.
4. Customer pays in any supported UPI app and submits the UPI transaction reference (UTR).
5. Admin checks the actual bank/UPI statement and approves only a matching payment.
6. The database creates the subscription idempotently after admin approval.

## Functions and database
- `create-manual-upi-order`: authenticated order creation; price is read server-side.
- `submit-manual-upi-reference`: verifies order ownership and records the customer's UTR.
- `submit_manual_upi_payment`: database ownership-checked RPC alternative.
- `admin_approve_manual_upi_payment`: admin-only reconciliation and subscription activation.
- `_shared/upi.ts`: validates VPA, amount and order reference before creating a UPI intent.

## Critical limitation
A static UPI QR or UPI intent does not send a trusted payment confirmation to this app. A customer-submitted screenshot or UTR is not proof of payment. Until a bank/provider statement feed is integrated, an admin must independently match the exact amount and UTR in the account statement before approving. Do not enable instant automatic activation from a client redirect.

## Required deployment
1. Apply migrations in order, including `0003_manual_upi_reconciliation.sql`.
2. Set Supabase function secrets `UPI_MERCHANT_VPA=javaidbeigh121@okaxis` and `UPI_MERCHANT_NAME=Javaid Beigh`.
3. Deploy `create-manual-upi-order` and `submit-manual-upi-reference`.
4. Complete and test the customer checkout UI and admin approval UI.
5. WireGuard peer provisioning remains a separate server integration; no VPN peer is created by this payment foundation.

Never store UPI PINs, OTPs, bank passwords or private WireGuard keys in the repository.
