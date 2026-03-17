import { TransactionType } from '@prisma/client';

export type ProviderRequest = {
  amount: number;
  currency: string;
  type: TransactionType;
  reference: string;
};

export type ProviderResult = {
  providerName: string;
  externalRef: string;
};

export interface ProviderConnector {
  readonly name: string;
  isHealthy(): Promise<boolean>;
  initiate(request: ProviderRequest): Promise<ProviderResult>;
}
