import { create } from 'zustand';
import type { PreOrder, ShopInfo, OrderStatus, PaymentRecord } from '@/types/order';
import { mockOrders, mockShops } from '@/data/mockData';
import { generateId, saveToStorage, storageKeys, loadFromStorage } from '@/utils/storage';

interface OrderStore {
  orders: PreOrder[];
  shops: ShopInfo[];
  initialized: boolean;

  initStore: () => Promise<void>;

  addOrder: (data: Partial<PreOrder>) => PreOrder;
  updateOrder: (id: string, data: Partial<PreOrder>) => void;
  deleteOrder: (id: string) => void;

  addPayment: (orderId: string, payment: Partial<PaymentRecord>) => void;
  updatePayment: (orderId: string, paymentId: string, data: Partial<PaymentRecord>) => void;
  markPaymentPaid: (orderId: string, paymentId: string) => void;

  markDelayed: (orderId: string, reason: string, newMonth?: string) => void;
  updateTracking: (orderId: string, trackingNo: string, carrier: string) => void;
  markShipped: (orderId: string) => void;
  markDelivered: (orderId: string) => void;
  markAccepted: (orderId: string) => void;

  addShop: (data: Partial<ShopInfo>) => ShopInfo;
  updateShop: (id: string, data: Partial<ShopInfo>) => void;
  deleteShop: (id: string) => void;

  getOrdersByStatus: (status: OrderStatus) => PreOrder[];
  getOrdersByShop: (shopId: string) => PreOrder[];
  getPendingDeliveries: () => PreOrder[];
  getAcceptedOrders: () => PreOrder[];
  getMonthPayments: (month: string) => PreOrder[];
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  deposit_paid: 'waiting_balance',
  waiting_balance: 'balance_paid',
  balance_paid: 'shipping',
  shipping: 'delivered',
  delivered: 'accepted',
  accepted: null,
  delayed: 'waiting_balance',
  cancelled: null
};

const updateOrderStatus = (order: PreOrder): PreOrder => {
  const now = new Date().toISOString();
  const { payments, trackingNo, shippedAt, deliveredAt, acceptedAt, isDelayed } = order;

  if (acceptedAt) return { ...order, status: 'accepted', updatedAt: now };
  if (deliveredAt) return { ...order, status: 'delivered', updatedAt: now };
  if (shippedAt && trackingNo) return { ...order, status: 'shipping', updatedAt: now };

  const balancePaid = payments.some(p => p.type === 'balance' && p.status === 'paid');
  if (balancePaid) return { ...order, status: 'balance_paid', updatedAt: now };

  const depositPaid = payments.some(p => p.type === 'deposit' && p.status === 'paid');
  if (depositPaid && isDelayed) return { ...order, status: 'delayed', updatedAt: now };
  if (depositPaid) return { ...order, status: 'waiting_balance', updatedAt: now };

  return { ...order, status: 'deposit_paid', updatedAt: now };
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  shops: [],
  initialized: false,

  initStore: async () => {
    if (get().initialized) return;

    const savedOrders = await loadFromStorage<PreOrder[]>(storageKeys.ORDERS, []);
    const savedShops = await loadFromStorage<ShopInfo[]>(storageKeys.SHOPS, []);

    set({
      orders: savedOrders.length > 0 ? savedOrders : mockOrders,
      shops: savedShops.length > 0 ? savedShops : mockShops,
      initialized: true
    });
  },

  addOrder: (data) => {
    const now = new Date().toISOString();
    const nowDate = new Date().toISOString().split('T')[0];
    const orderDate = data.orderDate || nowDate;

    const defaultPayments: PaymentRecord[] = [
      {
        id: generateId(),
        type: 'deposit',
        amount: data.deposit || 0,
        paidAt: orderDate,
        reminder: false,
        status: 'paid'
      },
      {
        id: generateId(),
        type: 'balance',
        amount: data.balance || 0,
        dueDate: data.expectedMonth ? `${data.expectedMonth}-01` : undefined,
        reminder: true,
        status: 'unpaid'
      }
    ];

    const newOrder: PreOrder = {
      id: generateId(),
      title: data.title || '新手办预订',
      series: data.series,
      character: data.character,
      maker: data.maker,
      scale: data.scale,
      shopId: data.shopId || '',
      shopName: data.shopName || '未指定店铺',
      totalPrice: data.totalPrice || 0,
      deposit: data.deposit || 0,
      balance: data.balance || 0,
      expectedMonth: data.expectedMonth || '',
      actualMonth: data.actualMonth,
      orderDate,
      orderNo: data.orderNo,
      payments: data.payments || defaultPayments,
      status: 'waiting_balance',
      isDelayed: false,
      delayTimes: 0,
      trackingNo: data.trackingNo,
      shippingCarrier: data.shippingCarrier,
      shippedAt: data.shippedAt,
      deliveredAt: data.deliveredAt,
      acceptedAt: data.acceptedAt,
      photos: [],
      issues: [],
      customerNotes: data.customerNotes,
      internalNotes: data.internalNotes,
      isFavorite: data.isFavorite || false,
      createdAt: now,
      updatedAt: now
    };

    const withStatus = updateOrderStatus(newOrder);
    const orders = [...get().orders, withStatus];
    set({ orders });
    saveToStorage(storageKeys.ORDERS, orders);
    return withStatus;
  },

  updateOrder: (id, data) => {
    const orders = get().orders.map(o => {
      if (o.id !== id) return o;
      const updated = { ...o, ...data, updatedAt: new Date().toISOString() };
      return updateOrderStatus(updated);
    });
    set({ orders });
    saveToStorage(storageKeys.ORDERS, orders);
  },

  deleteOrder: (id) => {
    const orders = get().orders.filter(o => o.id !== id);
    set({ orders });
    saveToStorage(storageKeys.ORDERS, orders);
  },

  addPayment: (orderId, payment) => {
    const newPayment: PaymentRecord = {
      id: generateId(),
      type: payment.type || 'other',
      amount: payment.amount || 0,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
      reminder: payment.reminder ?? false,
      status: payment.status || 'unpaid'
    };
    const orders = get().orders.map(o => {
      if (o.id !== orderId) return o;
      const updated = {
        ...o,
        payments: [...o.payments, newPayment],
        updatedAt: new Date().toISOString()
      };
      return updateOrderStatus(updated);
    });
    set({ orders });
    saveToStorage(storageKeys.ORDERS, orders);
  },

  updatePayment: (orderId, paymentId, data) => {
    const orders = get().orders.map(o => {
      if (o.id !== orderId) return o;
      const updated = {
        ...o,
        payments: o.payments.map(p =>
          p.id === paymentId ? { ...p, ...data } : p
        ),
        updatedAt: new Date().toISOString()
      };
      return updateOrderStatus(updated);
    });
    set({ orders });
    saveToStorage(storageKeys.ORDERS, orders);
  },

  markPaymentPaid: (orderId, paymentId) => {
    get().updatePayment(orderId, paymentId, {
      status: 'paid',
      paidAt: new Date().toISOString().split('T')[0]
    });
  },

  markDelayed: (orderId, reason, newMonth) => {
    const orders = get().orders.map(o => {
      if (o.id !== orderId) return o;
      const updated: PreOrder = {
        ...o,
        isDelayed: true,
        delayReason: reason,
        delayTimes: o.delayTimes + 1,
        expectedMonth: newMonth || o.expectedMonth,
        actualMonth: newMonth,
        status: 'delayed',
        updatedAt: new Date().toISOString()
      };
      return updated;
    });
    set({ orders });
    saveToStorage(storageKeys.ORDERS, orders);
  },

  updateTracking: (orderId, trackingNo, carrier) => {
    get().updateOrder(orderId, {
      trackingNo,
      shippingCarrier: carrier
    });
  },

  markShipped: (orderId) => {
    get().updateOrder(orderId, {
      shippedAt: new Date().toISOString().split('T')[0]
    });
  },

  markDelivered: (orderId) => {
    get().updateOrder(orderId, {
      deliveredAt: new Date().toISOString().split('T')[0]
    });
  },

  markAccepted: (orderId) => {
    get().updateOrder(orderId, {
      acceptedAt: new Date().toISOString().split('T')[0]
    });
  },

  addShop: (data) => {
    const newShop: ShopInfo = {
      id: generateId(),
      name: data.name || '新店铺',
      platform: data.platform || '',
      contact: data.contact,
      notes: data.notes
    };
    const shops = [...get().shops, newShop];
    set({ shops });
    saveToStorage(storageKeys.SHOPS, shops);
    return newShop;
  },

  updateShop: (id, data) => {
    const shops = get().shops.map(s =>
      s.id === id ? { ...s, ...data } : s
    );
    set({ shops });
    saveToStorage(storageKeys.SHOPS, shops);
  },

  deleteShop: (id) => {
    const shops = get().shops.filter(s => s.id !== id);
    set({ shops });
    saveToStorage(storageKeys.SHOPS, shops);
  },

  getOrdersByStatus: (status) => get().orders.filter(o => o.status === status),
  getOrdersByShop: (shopId) => get().orders.filter(o => o.shopId === shopId),
  getPendingDeliveries: () => get().orders.filter(o =>
    o.status === 'shipping' || o.status === 'delivered' || o.status === 'balance_paid'
  ),
  getAcceptedOrders: () => get().orders.filter(o => o.status === 'accepted'),
  getMonthPayments: (month) => get().orders.filter(o => {
    const unpaidBalances = o.payments.filter(
      p => p.type === 'balance' && p.status === 'unpaid'
    );
    return unpaidBalances.some(p => p.dueDate?.startsWith(month));
  })
}));
