export type OrderStatus =
  | 'deposit_paid'
  | 'waiting_balance'
  | 'balance_paid'
  | 'shipping'
  | 'delivered'
  | 'accepted'
  | 'delayed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface ShopInfo {
  id: string;
  name: string;
  platform: string;
  contact?: string;
  notes?: string;
  balanceRule?: string;
  advanceNoticeDays?: number;
}

export interface InspectionIssue {
  id: string;
  type: 'missing' | 'damaged' | 'other';
  description: string;
  resolved: boolean;
  createdAt: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  type: 'unboxing' | 'inspection' | 'other';
  uploadAt: string;
}

export interface PaymentRecord {
  id: string;
  type: 'deposit' | 'balance' | 'other';
  amount: number;
  paidAt?: string;
  dueDate?: string;
  reminder: boolean;
  status: PaymentStatus;
}

export interface PreOrder {
  id: string;
  title: string;
  series?: string;
  character?: string;
  maker?: string;
  scale?: string;
  shopId: string;
  shopName: string;
  totalPrice: number;
  deposit: number;
  balance: number;
  expectedMonth: string;
  actualMonth?: string;
  orderDate: string;
  orderNo?: string;
  payments: PaymentRecord[];
  status: OrderStatus;
  isDelayed: boolean;
  delayReason?: string;
  delayTimes: number;
  trackingNo?: string;
  shippingCarrier?: string;
  shippedAt?: string;
  deliveredAt?: string;
  acceptedAt?: string;
  photos: PhotoItem[];
  issues: InspectionIssue[];
  customerNotes?: string;
  internalNotes?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSeries {
  series: string;
  total: number;
  paid: number;
  pending: number;
  count: number;
}

export interface MonthPayment {
  month: string;
  total: number;
  deposit: number;
  balance: number;
  orderCount: number;
  orderIds: string[];
}
