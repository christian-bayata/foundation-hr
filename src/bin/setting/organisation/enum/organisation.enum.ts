export enum BusinessType {
  PRIVATE_LIMITED = 'private_limited',
  PUBLIC_LIMITED = 'public_limited',
  LLC = 'llc',
  NON_PROFIT = 'non_profit',
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  PARTNERSHIP = 'partnership',
  GOVERNMENT = 'government',
  OTHER = 'other',
}

export enum PaymentInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum InvoiceStatus {
  PAID = 'paid',
  PENDING = 'pending',
  FAILED = 'failed',
}
