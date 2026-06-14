import { create } from 'zustand';
import dayjs from 'dayjs';
import type { PreOrder, ShopInfo, OrderStatus, PaymentRecord, MonthlyBudget, DeferRecord } from '@/types/order';
import { mockOrders, mockShops } from '@/data/mockData';
import { generateId, saveToStorage, storageKeys, loadFromStorage } from '@/utils/storage';

interface OrderStore {
  orders: PreOrder[];
  shops: ShopInfo[];
  monthlyBudgets: MonthlyBudget[];
  initialized: boolean;

  initStore: () => Promise<void>;

  addOrder: (data: Partial<PreOrder>) => PreOrder;
  updateOrder: (id: string, data: Partial<PreOrder>) => void;
  deleteOrder: (id: string) => void;

  addPayment: (orderId: string, payment: Partial<PaymentRecord>) => void;
  updatePayment: (orderId: string, paymentId: string, data: Partial<PaymentRecord>) => void;
  markPaymentPaid: (orderId: string, paymentId: string) => void;
  togglePaymentReminder: (orderId: string, paymentId: string) => void;
  disablePaymentReminder: (orderId: string, paymentId: string) => void;
  deferPayment: (orderId: string, paymentId: string, reason: string, newDueDate?: string) => void;

  markDelayed: (orderId: string, reason: string, newMonth?: string) => void;
  updateTracking: (orderId: string, trackingNo: string, carrier: string) => void;
  markShipped: (orderId: string) => void;
  markDelivered: (orderId: string) => void;
  markAccepted: (orderId: string) => void;
  confirmCollection: (orderId: string) => void;
  removeFromCollection: (orderId: string) => void;
  abandonCollection: (orderId: string, note?: string) => void;
  restoreToCabinet: (orderId: string) => void;

  addShop: (data: Partial<ShopInfo>) => ShopInfo;
  updateShop: (id: string, data: Partial<ShopInfo>) => void;
  deleteShop: (id: string) => void;

  setMonthlyBudget: (month: string, limit: number) => void;

  getOrdersByStatus: (status: OrderStatus) => PreOrder[];
  getOrdersByShop: (shopId: string) => PreOrder[];
  getPendingDeliveries: () => PreOrder[];
  getAcceptedOrders: () => PreOrder[];
  getCollectedOrders: () => PreOrder[];
  getRemovedOrders: () => PreOrder[];
  getMonthPayments: (month: string) => PreOrder[];
  getBudgetDecisionList: (month: string) => Array<{
    order: PreOrder;
    payment: PaymentRecord;
    riskScore: number;
    riskLevel: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  getShopRiskScore: (shopId: string) => { score: number; reasons: string[] };
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

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  deposit_paid: ['waiting_balance', 'delayed', 'cancelled'],
  waiting_balance: ['balance_paid', 'delayed', 'cancelled'],
  balance_paid: ['shipping', 'delayed', 'cancelled'],
  shipping: ['delivered'],
  delivered: ['accepted'],
  accepted: [],
  delayed: ['waiting_balance', 'balance_paid', 'cancelled'],
  cancelled: []
};

const RISK_KEYWORDS = ['慢', '差', '坑', '不推荐', '售后差'];

const calculateShopRiskScore = (
  shop: ShopInfo | undefined,
  shopOrders: PreOrder[]
): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  if (!shop || shopOrders.length === 0) {
    return { score: 0, reasons: ['数据不足'] };
  }

  const totalOrders = shopOrders.length;
  const delayedOrders = shopOrders.filter(o => o.isDelayed).length;
  const delayRate = totalOrders > 0 ? delayedOrders / totalOrders : 0;

  if (delayRate >= 0.5) {
    score += 35;
    reasons.push(`订单延期率${Math.round(delayRate * 100)}%`);
  } else if (delayRate >= 0.3) {
    score += 20;
    reasons.push(`订单延期率${Math.round(delayRate * 100)}%`);
  } else if (delayRate > 0) {
    score += 10;
  }

  const unresolvedIssues = shopOrders.reduce((count, o) => {
    return count + o.issues.filter(i => !i.resolved).length;
  }, 0);

  if (unresolvedIssues >= 3) {
    score += 25;
    reasons.push(`${unresolvedIssues}个未解决验尸问题`);
  } else if (unresolvedIssues >= 1) {
    score += 15;
    reasons.push(`${unresolvedIssues}个未解决验尸问题`);
  }

  const notes = shop.notes || '';
  const matchedKeywords = RISK_KEYWORDS.filter(kw => notes.includes(kw));
  if (matchedKeywords.length > 0) {
    score += Math.min(25, matchedKeywords.length * 10);
    reasons.push(`备注含风险词: ${matchedKeywords.join('、')}`);
  }

  const advanceDays = shop.advanceNoticeDays ?? 30;
  if (advanceDays <= 7) {
    score += 20;
    reasons.push(`补款期仅${advanceDays}天`);
  } else if (advanceDays <= 14) {
    score += 15;
    reasons.push(`补款期${advanceDays}天`);
  } else if (advanceDays <= 21) {
    score += 10;
  }

  return { score: Math.min(100, score), reasons };
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
  monthlyBudgets: [],
  initialized: false,

  initStore: async () => {
    if (get().initialized) return;

    const savedOrders = await loadFromStorage<PreOrder[]>(storageKeys.ORDERS, []);
    const savedShops = await loadFromStorage<ShopInfo[]>(storageKeys.SHOPS, []);
    const savedBudgets = await loadFromStorage<MonthlyBudget[]>(storageKeys.BUDGETS, []);

    const sourceOrders = savedOrders.length > 0 ? savedOrders : mockOrders;
    const migratedOrders = sourceOrders.map(o => {
      let cabinetStatus = o.cabinetStatus;
      if (!cabinetStatus) {
        if (o.status === 'accepted' && o.isFavorite) {
          cabinetStatus = 'collected';
        } else if (o.status === 'accepted') {
          cabinetStatus = 'pending_cabinet';
        } else {
          cabinetStatus = 'none';
        }
      }
      return {
        ...o,
        cabinetStatus,
        isFavorite: cabinetStatus === 'collected',
        cabinetNote: o.cabinetNote || '',
        deferRecords: o.deferRecords || []
      };
    });

    set({
      orders: migratedOrders,
      shops: savedShops.length > 0 ? savedShops : mockShops,
      monthlyBudgets: savedBudgets,
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
      cabinetStatus: 'none',
      cabinetNote: '',
      deferRecords: [],
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

  togglePaymentReminder: (orderId, paymentId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    const payment = order.payments.find(p => p.id === paymentId);
    if (!payment) return;
    get().updatePayment(orderId, paymentId, {
      reminder: !payment.reminder
    });
  },

  disablePaymentReminder: (orderId, paymentId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    const payment = order.payments.find(p => p.id === paymentId);
    if (!payment || !payment.reminder) return;
    get().updatePayment(orderId, paymentId, {
      reminder: false
    });
  },

  markDelayed: (orderId, reason, newMonth) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (!VALID_TRANSITIONS[order.status]?.includes('delayed') && order.status !== 'delayed') {
      console.warn('[Store] markDelayed: invalid transition from', order.status);
      return;
    }
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
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status !== 'balance_paid') {
      console.warn('[Store] markShipped: invalid transition from', order.status);
      return;
    }
    get().updateOrder(orderId, {
      shippedAt: new Date().toISOString().split('T')[0]
    });
  },

  markDelivered: (orderId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status !== 'shipping') {
      console.warn('[Store] markDelivered: invalid transition from', order.status);
      return;
    }
    get().updateOrder(orderId, {
      deliveredAt: new Date().toISOString().split('T')[0]
    });
  },

  markAccepted: (orderId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status !== 'delivered') {
      console.warn('[Store] markAccepted: invalid transition from', order.status);
      return;
    }
    get().updateOrder(orderId, {
      acceptedAt: new Date().toISOString().split('T')[0],
      cabinetStatus: 'pending_cabinet'
    });
  },

  addToCabinet: (orderId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status !== 'accepted') {
      console.warn('[Store] addToCabinet: order not accepted yet', orderId);
      return;
    }
    get().updateOrder(orderId, {
      isFavorite: true,
      cabinetStatus: 'collected'
    });
  },

  confirmCollection: (orderId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.cabinetStatus !== 'pending_cabinet') {
      console.warn('[Store] confirmCollection: order not in pending_cabinet', orderId);
      return;
    }
    get().updateOrder(orderId, {
      isFavorite: true,
      cabinetStatus: 'collected'
    });
  },

  removeFromCollection: (orderId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.cabinetStatus !== 'collected') return;
    get().updateOrder(orderId, {
      isFavorite: false,
      cabinetStatus: 'pending_cabinet'
    });
  },

  abandonCollection: (orderId, note) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status !== 'accepted') return;
    get().updateOrder(orderId, {
      isFavorite: false,
      cabinetStatus: 'removed',
      cabinetNote: note || order.cabinetNote
    });
  },

  restoreToCabinet: (orderId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.cabinetStatus !== 'removed') return;
    get().updateOrder(orderId, {
      cabinetStatus: 'pending_cabinet',
      cabinetNote: ''
    });
  },

  deferPayment: (orderId, paymentId, reason, newDueDate) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;
    const payment = order.payments.find(p => p.id === paymentId);
    if (!payment) return;

    const deferRecord: DeferRecord = {
      id: generateId(),
      reason,
      createdAt: new Date().toISOString(),
      originalDueDate: payment.dueDate,
      newDueDate
    };

    const updatedPayments = order.payments.map(p =>
      p.id === paymentId && newDueDate ? { ...p, dueDate: newDueDate } : p
    );

    const updatedInternalNotes = order.internalNotes
      ? `${order.internalNotes}\n\n【暂缓付款】${reason}`
      : `【暂缓付款】${reason}`;

    get().updateOrder(orderId, {
      payments: updatedPayments,
      deferRecords: [...order.deferRecords, deferRecord],
      internalNotes: updatedInternalNotes
    });
  },

  addShop: (data) => {
    const newShop: ShopInfo = {
      id: generateId(),
      name: data.name || '新店铺',
      platform: data.platform || '',
      contact: data.contact,
      notes: data.notes,
      balanceRule: data.balanceRule,
      advanceNoticeDays: data.advanceNoticeDays
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

  setMonthlyBudget: (month, limit) => {
    const budgets = get().monthlyBudgets;
    const idx = budgets.findIndex(b => b.month === month);
    let updated: MonthlyBudget[];
    if (idx >= 0) {
      updated = budgets.map(b => b.month === month ? { ...b, limit } : b);
    } else {
      updated = [...budgets, { month, limit }];
    }
    set({ monthlyBudgets: updated });
    saveToStorage(storageKeys.BUDGETS, updated);
  },

  getOrdersByStatus: (status) => get().orders.filter(o => o.status === status),
  getOrdersByShop: (shopId) => get().orders.filter(o => o.shopId === shopId),
  getPendingDeliveries: () => get().orders.filter(o =>
    o.status === 'shipping' || o.status === 'delivered' || o.status === 'balance_paid'
  ),
  getAcceptedOrders: () => get().orders.filter(o => o.status === 'accepted'),
  getCollectedOrders: () => get().orders.filter(o => o.cabinetStatus === 'collected'),
  getRemovedOrders: () => get().orders.filter(o => o.cabinetStatus === 'removed'),
  getMonthPayments: (month) => get().orders.filter(o => {
    const unpaidBalances = o.payments.filter(
      p => p.type === 'balance' && p.status === 'unpaid'
    );
    return unpaidBalances.some(p => p.dueDate?.startsWith(month));
  }),
  getShopRiskScore: (shopId) => {
    const shop = get().shops.find(s => s.id === shopId);
    const shopOrders = get().orders.filter(o => o.shopId === shopId);
    return calculateShopRiskScore(shop, shopOrders);
  },

  getBudgetDecisionList: (month) => {
    const orders = get().orders;
    const budgetLimit = get().monthlyBudgets.find(b => b.month === month)?.limit || 0;
    const shops = get().shops;
    const list: Array<{
      order: PreOrder;
      payment: PaymentRecord;
      riskScore: number;
      riskLevel: 'high' | 'medium' | 'low';
      reason: string;
    }> = [];
    let monthTotal = 0;
    orders.forEach(o => {
      o.payments.forEach(p => {
        if (p.status !== 'unpaid' || !p.dueDate?.startsWith(month)) return;
        monthTotal += p.amount;
      });
    });

    orders.forEach(o => {
      o.payments.forEach(p => {
        if (p.status !== 'unpaid' || !p.dueDate?.startsWith(month)) return;
        const shop = shops.find(s => s.id === o.shopId);
        const shopOrders = orders.filter(order => order.shopId === o.shopId);
        const shopRisk = calculateShopRiskScore(shop, shopOrders);
        const daysUntilDue = Math.max(0, dayjs(p.dueDate).diff(dayjs(), 'day'));

        let score = 0;
        const reasons: string[] = [];

        const amountRatio = budgetLimit > 0 ? p.amount / budgetLimit : 0;
        if (amountRatio >= 0.3) { score += 40; reasons.push('高金额'); }
        else if (amountRatio >= 0.15) { score += 20; reasons.push('金额中等'); }

        if (daysUntilDue <= 7) { score += 35; reasons.push('7天内到期'); }
        else if (daysUntilDue <= 15) { score += 20; reasons.push('半月内到期'); }
        else if (daysUntilDue <= 30) { score += 10; }

        if (shopRisk.score >= 50) {
          score += 25;
          reasons.push(`店铺高风险: ${shopRisk.reasons[0]}`);
        } else if (shopRisk.score >= 25) {
          score += 15;
          reasons.push(`店铺中风险: ${shopRisk.reasons[0]}`);
        } else if (shopRisk.score > 0) {
          score += 5;
        }

        if (o.deferRecords && o.deferRecords.length > 0) { score += 15; reasons.push('已暂缓过'); }

        if (budgetLimit > 0 && monthTotal > budgetLimit * 0.8 && amountRatio >= 0.1) {
          score += 15; reasons.push('推高预算');
        }

        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        if (score >= 50) riskLevel = 'high';
        else if (score >= 25) riskLevel = 'medium';

        list.push({
          order: o,
          payment: p,
          riskScore: Math.min(100, score),
          riskLevel,
          reason: reasons.length > 0 ? reasons.join('、') : '低风险'
        });
      });
    });

    return list.sort((a, b) => b.riskScore - a.riskScore);
  }
}));
