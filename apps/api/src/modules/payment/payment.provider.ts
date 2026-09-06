import { PaymentGatewayProvider } from '@library/types';

export interface CreateOrderPayload {
  libraryId: string;
  planId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface RemoteOrderResult {
  orderId: string;
  provider: PaymentGatewayProvider;
  amount: number;
  currency: string;
  providerOrderId: string;
  token?: string;
}

export interface WebhookVerifyResult {
  isValid: boolean;
  provider: PaymentGatewayProvider;
  eventType: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  idempotencyKey: string;
}

export interface IPaymentProvider {
  readonly providerName: PaymentGatewayProvider;
  createOrder(payload: CreateOrderPayload): Promise<RemoteOrderResult>;
  verifyWebhook(rawPayload: Buffer, signature: string): Promise<WebhookVerifyResult>;
}

export class ManualAdminPaymentProvider implements IPaymentProvider {
  readonly providerName: PaymentGatewayProvider = 'MANUAL_ADMIN';

  async createOrder(payload: CreateOrderPayload): Promise<RemoteOrderResult> {
    return {
      orderId: 'manual-order',
      provider: this.providerName,
      amount: payload.amount,
      currency: payload.currency,
      providerOrderId: `admin_manual_${Date.now()}`,
    };
  }

  async verifyWebhook(_rawPayload: Buffer, _signature: string): Promise<WebhookVerifyResult> {
    return {
      isValid: true,
      provider: this.providerName,
      eventType: 'manual.grant',
      idempotencyKey: `manual_${Date.now()}`,
    };
  }
}
