# ADR-004: Multi-Gateway Payment Abstraction and Idempotent Webhook Processing

## Status
Accepted

## Context
The SaaS platform requires payment processing across two major Indian payment gateways:
1. **Razorpay**
2. **Cashfree**

In addition, Platform Super Admins must be able to **manually grant or extend subscriptions** (e.g., for offline payments, bank NEFT/RTGS, or promotional partnerships) through the same unified subscription state machine.
Furthermore, payment webhooks are notoriously prone to at-least-once delivery duplicates, network retries, and race conditions.

## Decision
1. **Payment Strategy Interface (`IPaymentProvider`)**:
   An abstract interface standardizes order creation, webhook verification, refund processing, and status checks across Razorpay, Cashfree, and Admin Manual sources:
   ```typescript
   export interface IPaymentProvider {
     readonly providerName: 'RAZORPAY' | 'CASHFREE' | 'MANUAL_ADMIN';
     createOrder(payload: CreateOrderDTO): Promise<PaymentOrderResult>;
     verifyWebhook(rawPayload: Buffer, signature: string): Promise<WebhookVerificationResult>;
   }
   ```
2. **Strict Webhook Idempotency**:
   * Every incoming webhook payload computes an `idempotency_key = ${provider}_${eventId || paymentId}`.
   * Stored in a dedicated `webhook_events` table with a database unique index.
   * Processed within a PostgreSQL transaction. If the key already exists, the server immediately acknowledges with `200 OK` and skips state mutations.
3. **Admin Manual Subscriptions**:
   Platform admin grants create standard `subscriptions` and `payments` records with `provider = 'MANUAL_ADMIN'`. This ensures downstream code checks only one question: `"Does this library have an active subscription?"` without ad-hoc bypass flags.

## Consequences
### Positive:
* Eliminates vendor lock-in; easy to switch default gateways or add international gateways (Stripe) in future.
* Immune to duplicate webhook processing and phantom subscription renewals.
* Consistent audit trail for both digital gateway transactions and manual administrative overrides.

### Negative:
* Requires maintaining signature verification and client libraries for multiple providers.
