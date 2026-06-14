import type { PreOrder, ShopInfo } from '@/types/order';

export const mockShops: ShopInfo[] = [
  {
    id: 'shop_001',
    name: '甘楽屋',
    platform: '淘宝',
    contact: '旺旺客服',
    notes: '老牌手办店，信誉良好，一般提前1月通知补款',
    balanceRule: '到货后7天内补齐尾款，超期可能取消订单',
    advanceNoticeDays: 30
  },
  {
    id: 'shop_002',
    name: '鹤屋通贩',
    platform: '淘宝',
    contact: '客服QQ群',
    notes: '常有限定特典，补款通知及时',
    balanceRule: '到货通知后5天内完成补款，可申请延期3天',
    advanceNoticeDays: 14
  },
  {
    id: 'shop_003',
    name: '魔法集市',
    platform: '自营APP',
    contact: 'APP内客服',
    notes: '日版正品，直邮EMS，物流较慢',
    balanceRule: '到货后10天内补尾款，国际物流需额外等待',
    advanceNoticeDays: 21
  },
  {
    id: 'shop_004',
    name: 'Amiami中国',
    platform: '官网',
    contact: '邮件客服',
    notes: '可用支付宝，发货包装好',
    balanceRule: '发货前需完成尾款支付，否则不予发货',
    advanceNoticeDays: 7
  },
  {
    id: 'shop_005',
    name: '手办童萌会',
    platform: '淘宝',
    contact: '旺旺客服',
    notes: '现货速度快，特典齐全',
    balanceRule: '现货下单即付全款，预订到货后3天补尾款',
    advanceNoticeDays: 7
  }
];

export const mockOrders: PreOrder[] = [
  {
    id: 'order_001',
    title: '初音未来 10周年纪念Ver.',
    series: 'VOCALOID',
    character: '初音未来',
    maker: 'Good Smile Company',
    scale: '1/7',
    shopId: 'shop_001',
    shopName: '甘楽屋',
    totalPrice: 1280.00,
    deposit: 300.00,
    balance: 980.00,
    expectedMonth: '2026-06',
    orderDate: '2025-11-15',
    orderNo: 'GLW20251115001',
    payments: [
      {
        id: 'pay_001_1',
        type: 'deposit',
        amount: 300.00,
        paidAt: '2025-11-15',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_001_2',
        type: 'balance',
        amount: 980.00,
        dueDate: '2026-06-10',
        reminder: true,
        status: 'unpaid'
      }
    ],
    status: 'waiting_balance',
    isDelayed: false,
    delayTimes: 0,
    photos: [],
    issues: [],
    isFavorite: true,
    createdAt: '2025-11-15T10:00:00',
    updatedAt: '2025-11-15T10:00:00',
    customerNotes: '客服说预计6月中旬到货，注意查收短信'
  },
  {
    id: 'order_002',
    title: '蕾姆 水着Ver.',
    series: 'Re:从零开始的异世界生活',
    character: '蕾姆',
    maker: 'KADOKAWA',
    scale: '1/7',
    shopId: 'shop_002',
    shopName: '鹤屋通贩',
    totalPrice: 1580.00,
    deposit: 400.00,
    balance: 1180.00,
    expectedMonth: '2026-05',
    actualMonth: '2026-07',
    orderDate: '2025-10-20',
    orderNo: 'HY20251020089',
    payments: [
      {
        id: 'pay_002_1',
        type: 'deposit',
        amount: 400.00,
        paidAt: '2025-10-20',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_002_2',
        type: 'balance',
        amount: 1180.00,
        dueDate: '2026-07-05',
        reminder: true,
        status: 'unpaid'
      }
    ],
    status: 'delayed',
    isDelayed: true,
    delayReason: '厂家延期至7月发售',
    delayTimes: 1,
    photos: [],
    issues: [],
    isFavorite: true,
    createdAt: '2025-10-20T14:30:00',
    updatedAt: '2026-03-15T09:00:00',
    customerNotes: '延期一次，客服发了邮件通知'
  },
  {
    id: 'order_003',
    title: 'Saber Alter 礼服Ver.',
    series: 'Fate/stay night',
    character: '阿尔托莉雅·潘德拉贡',
    maker: 'ALTER',
    scale: '1/7',
    shopId: 'shop_003',
    shopName: '魔法集市',
    totalPrice: 2200.00,
    deposit: 500.00,
    balance: 1700.00,
    expectedMonth: '2026-04',
    orderDate: '2025-09-08',
    orderNo: 'MS20250908123',
    payments: [
      {
        id: 'pay_003_1',
        type: 'deposit',
        amount: 500.00,
        paidAt: '2025-09-08',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_003_2',
        type: 'balance',
        amount: 1700.00,
        dueDate: '2026-04-10',
        paidAt: '2026-04-08',
        reminder: true,
        status: 'paid'
      }
    ],
    status: 'shipping',
    isDelayed: false,
    delayTimes: 0,
    trackingNo: 'EE123456789JP',
    shippingCarrier: 'EMS国际',
    shippedAt: '2026-04-20',
    photos: [],
    issues: [],
    isFavorite: true,
    createdAt: '2025-09-08T16:20:00',
    updatedAt: '2026-04-20T11:00:00',
    customerNotes: '已发货，EMS单号可查'
  },
  {
    id: 'order_004',
    title: '02 制服Ver.',
    series: 'DARLING in the FRANXX',
    character: '02',
    maker: 'ANIPLEX+',
    scale: '1/7',
    shopId: 'shop_001',
    shopName: '甘楽屋',
    totalPrice: 1850.00,
    deposit: 500.00,
    balance: 1350.00,
    expectedMonth: '2026-03',
    orderDate: '2025-08-12',
    orderNo: 'GLW20250812045',
    payments: [
      {
        id: 'pay_004_1',
        type: 'deposit',
        amount: 500.00,
        paidAt: '2025-08-12',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_004_2',
        type: 'balance',
        amount: 1350.00,
        dueDate: '2026-03-10',
        paidAt: '2026-03-08',
        reminder: true,
        status: 'paid'
      }
    ],
    status: 'accepted',
    isDelayed: false,
    delayTimes: 0,
    trackingNo: 'SF1234567890123',
    shippingCarrier: '顺丰速运',
    shippedAt: '2026-03-20',
    deliveredAt: '2026-03-22',
    acceptedAt: '2026-03-23',
    photos: [
      {
        id: 'photo_001',
        url: 'https://picsum.photos/id/1/400/400',
        type: 'unboxing',
        uploadAt: '2026-03-23T15:00:00'
      }
    ],
    issues: [],
    isFavorite: true,
    createdAt: '2025-08-12T11:00:00',
    updatedAt: '2026-03-23T15:00:00',
    customerNotes: '包装完美，手办品质超赞！'
  },
  {
    id: 'order_005',
    title: '时崎狂三 晚礼服Ver.',
    series: '约会大作战',
    character: '时崎狂三',
    maker: 'Good Smile Company',
    scale: '1/7',
    shopId: 'shop_004',
    shopName: 'Amiami中国',
    totalPrice: 1650.00,
    deposit: 350.00,
    balance: 1300.00,
    expectedMonth: '2026-07',
    orderDate: '2025-12-01',
    orderNo: 'AMI20251201789',
    payments: [
      {
        id: 'pay_005_1',
        type: 'deposit',
        amount: 350.00,
        paidAt: '2025-12-01',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_005_2',
        type: 'balance',
        amount: 1300.00,
        dueDate: '2026-07-01',
        reminder: true,
        status: 'unpaid'
      }
    ],
    status: 'waiting_balance',
    isDelayed: false,
    delayTimes: 0,
    photos: [],
    issues: [],
    isFavorite: false,
    createdAt: '2025-12-01T09:30:00',
    updatedAt: '2025-12-01T09:30:00'
  },
  {
    id: 'order_006',
    title: '祢豆子 鬼化Ver.',
    series: '鬼灭之刃',
    character: '灶门祢豆子',
    maker: 'ANIPLEX+',
    scale: '1/8',
    shopId: 'shop_005',
    shopName: '手办童萌会',
    totalPrice: 980.00,
    deposit: 200.00,
    balance: 780.00,
    expectedMonth: '2026-06',
    orderDate: '2025-11-20',
    orderNo: 'TMH20251120321',
    payments: [
      {
        id: 'pay_006_1',
        type: 'deposit',
        amount: 200.00,
        paidAt: '2025-11-20',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_006_2',
        type: 'balance',
        amount: 780.00,
        dueDate: '2026-06-05',
        reminder: true,
        status: 'unpaid'
      }
    ],
    status: 'waiting_balance',
    isDelayed: false,
    delayTimes: 0,
    photos: [],
    issues: [],
    isFavorite: true,
    createdAt: '2025-11-20T13:45:00',
    updatedAt: '2025-11-20T13:45:00'
  },
  {
    id: 'order_007',
    title: '明日香 战斗服Ver.',
    series: '新世纪福音战士',
    character: '明日香',
    maker: 'REVOLVE',
    scale: '1/7',
    shopId: 'shop_002',
    shopName: '鹤屋通贩',
    totalPrice: 1450.00,
    deposit: 350.00,
    balance: 1100.00,
    expectedMonth: '2026-05',
    orderDate: '2025-10-05',
    orderNo: 'HY20251005456',
    payments: [
      {
        id: 'pay_007_1',
        type: 'deposit',
        amount: 350.00,
        paidAt: '2025-10-05',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_007_2',
        type: 'balance',
        amount: 1100.00,
        dueDate: '2026-05-08',
        paidAt: '2026-05-05',
        reminder: true,
        status: 'paid'
      }
    ],
    status: 'delivered',
    isDelayed: false,
    delayTimes: 0,
    trackingNo: 'YT123456789012',
    shippingCarrier: '圆通速递',
    shippedAt: '2026-05-18',
    deliveredAt: '2026-05-20',
    photos: [],
    issues: [],
    isFavorite: false,
    createdAt: '2025-10-05T10:15:00',
    updatedAt: '2026-05-20T14:00:00',
    customerNotes: '快递已签收，待开箱验收'
  },
  {
    id: 'order_008',
    title: '甘雨 循循守月',
    series: '原神',
    character: '甘雨',
    maker: 'APEX-TOYS',
    scale: '1/7',
    shopId: 'shop_003',
    shopName: '魔法集市',
    totalPrice: 1880.00,
    deposit: 450.00,
    balance: 1430.00,
    expectedMonth: '2026-08',
    orderDate: '2026-01-10',
    orderNo: 'MS20260110067',
    payments: [
      {
        id: 'pay_008_1',
        type: 'deposit',
        amount: 450.00,
        paidAt: '2026-01-10',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_008_2',
        type: 'balance',
        amount: 1430.00,
        dueDate: '2026-08-10',
        reminder: true,
        status: 'unpaid'
      }
    ],
    status: 'waiting_balance',
    isDelayed: false,
    delayTimes: 0,
    photos: [],
    issues: [],
    isFavorite: true,
    createdAt: '2026-01-10T16:00:00',
    updatedAt: '2026-01-10T16:00:00'
  },
  {
    id: 'order_009',
    title: '樱岛麻衣 兔女郎Ver.',
    series: '青春猪头少年系列',
    character: '樱岛麻衣',
    maker: 'FREEing',
    scale: '1/4',
    shopId: 'shop_001',
    shopName: '甘楽屋',
    totalPrice: 2600.00,
    deposit: 600.00,
    balance: 2000.00,
    expectedMonth: '2026-09',
    orderDate: '2026-02-15',
    orderNo: 'GLW20260215023',
    payments: [
      {
        id: 'pay_009_1',
        type: 'deposit',
        amount: 600.00,
        paidAt: '2026-02-15',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_009_2',
        type: 'balance',
        amount: 2000.00,
        dueDate: '2026-09-01',
        reminder: true,
        status: 'unpaid'
      }
    ],
    status: 'waiting_balance',
    isDelayed: false,
    delayTimes: 0,
    photos: [],
    issues: [],
    isFavorite: false,
    createdAt: '2026-02-15T11:20:00',
    updatedAt: '2026-02-15T11:20:00'
  },
  {
    id: 'order_010',
    title: '雪之下雪乃 女仆Ver.',
    series: '我的青春恋爱物语果然有问题',
    character: '雪之下雪乃',
    maker: 'Good Smile Company',
    scale: '1/7',
    shopId: 'shop_004',
    shopName: 'Amiami中国',
    totalPrice: 1380.00,
    deposit: 300.00,
    balance: 1080.00,
    expectedMonth: '2026-04',
    orderDate: '2025-09-25',
    orderNo: 'AMI20250925445',
    payments: [
      {
        id: 'pay_010_1',
        type: 'deposit',
        amount: 300.00,
        paidAt: '2025-09-25',
        reminder: false,
        status: 'paid'
      },
      {
        id: 'pay_010_2',
        type: 'balance',
        amount: 1080.00,
        dueDate: '2026-04-05',
        paidAt: '2026-04-03',
        reminder: true,
        status: 'paid'
      }
    ],
    status: 'accepted',
    isDelayed: false,
    delayTimes: 0,
    trackingNo: 'JD1234567890',
    shippingCarrier: '京东物流',
    shippedAt: '2026-04-15',
    deliveredAt: '2026-04-16',
    acceptedAt: '2026-04-16',
    photos: [
      {
        id: 'photo_002',
        url: 'https://picsum.photos/id/3/400/400',
        type: 'unboxing',
        uploadAt: '2026-04-16T18:30:00'
      }
    ],
    issues: [
      {
        id: 'issue_001',
        type: 'missing',
        description: '缺少一个底座配件，已联系客服补发',
        resolved: true,
        createdAt: '2026-04-16T19:00:00'
      }
    ],
    isFavorite: true,
    createdAt: '2025-09-25T15:00:00',
    updatedAt: '2026-04-16T19:00:00',
    customerNotes: '配件已补发，客服态度很好'
  }
];
