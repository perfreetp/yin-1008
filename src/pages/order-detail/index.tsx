import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import StatusTag from '@/components/StatusTag';
import { formatCurrency, formatMonth, generateId } from '@/utils/storage';
import type { PreOrder } from '@/types/order';
import dayjs from 'dayjs';

const COVER_MAP: Record<string, string> = {
  'VOCALOID': 'https://picsum.photos/id/1/400/400',
  'Re:从零开始的异世界生活': 'https://picsum.photos/id/106/400/400',
  'Fate/stay night': 'https://picsum.photos/id/119/400/400',
  'DARLING in the FRANXX': 'https://picsum.photos/id/225/400/400',
  '约会大作战': 'https://picsum.photos/id/338/400/400',
  '鬼灭之刃': 'https://picsum.photos/id/1025/400/400',
  '新世纪福音战士': 'https://picsum.photos/id/96/400/400',
  '原神': 'https://picsum.photos/id/160/400/400',
  '青春猪头少年系列': 'https://picsum.photos/id/1005/400/400',
  '我的青春恋爱物语果然有问题': 'https://picsum.photos/id/64/400/400'
};

const TIMELINE_STEPS = [
  { key: 'order', label: '预订下单' },
  { key: 'deposit', label: '支付订金' },
  { key: 'balance', label: '支付尾款' },
  { key: 'ship', label: '商品发货' },
  { key: 'delivery', label: '包裹签收' },
  { key: 'accept', label: '完成验收' }
];

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const {
    orders,
    shops,
    initStore,
    initialized,
    markPaymentPaid,
    markDelivered,
    markAccepted,
    markShipped,
    markDelayed,
    updateTracking,
    updateOrder
  } = useOrderStore();

  const orderId = router.params?.id || '';
  const order = orders.find(o => o.id === orderId);
  const shop = shops.find(s => s.id === order?.shopId);

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  const cover = order ? (order.photos[0]?.url || COVER_MAP[order.series || ''] || 'https://picsum.photos/id/201/400/400') : '';

  const timeline = useMemo(() => {
    if (!order) return [];
    const steps = [
      {
        key: 'order',
        label: '预订下单',
        active: !!order.orderDate,
        time: order.orderDate
      },
      {
        key: 'deposit',
        label: '支付订金',
        active: order.payments.some(p => p.type === 'deposit' && p.status === 'paid'),
        time: order.payments.find(p => p.type === 'deposit')?.paidAt
      },
      {
        key: 'balance',
        label: '支付尾款',
        active: order.payments.some(p => p.type === 'balance' && p.status === 'paid'),
        time: order.payments.find(p => p.type === 'balance')?.paidAt
      },
      {
        key: 'ship',
        label: '商品发货',
        active: !!order.shippedAt,
        time: order.shippedAt
      },
      {
        key: 'delivery',
        label: '包裹签收',
        active: !!order.deliveredAt,
        time: order.deliveredAt
      },
      {
        key: 'accept',
        label: '完成验收',
        active: !!order.acceptedAt,
        time: order.acceptedAt
      }
    ];
    return steps;
  }, [order]);

  if (!order) {
    return (
      <View style={{ padding: '120rpx 32rpx', textAlign: 'center' }}>
        <Text style={{ fontSize: '28rpx', color: '#9CA3AF' }}>订单不存在</Text>
      </View>
    );
  }

  const handleMarkPaymentPaid = (paymentId: string) => {
    Taro.showModal({
      title: '确认付款',
      content: '确认该款项已支付？',
      success: (res) => {
        if (res.confirm) {
          markPaymentPaid(order.id, paymentId);
          Taro.showToast({ title: '已标记付款', icon: 'success' });
        }
      }
    });
  };

  const handleMarkDelivered = () => {
    Taro.showModal({
      title: '确认签收',
      content: '确认包裹已签收？',
      success: (res) => {
        if (res.confirm) {
          markDelivered(order.id);
          Taro.showToast({ title: '已签收', icon: 'success' });
        }
      }
    });
  };

  const handleGoInspect = () => {
    Taro.navigateTo({
      url: `/pages/inspection/index?id=${order.id}`
    });
  };

  const handleEdit = () => {
    Taro.navigateTo({
      url: `/pages/order-edit/index?id=${order.id}`
    });
  };

  const handleMarkShipped = () => {
    Taro.showModal({
      title: '录入发货信息',
      editable: true,
      placeholderText: '请输入物流公司+单号，如：顺丰 SF1234567890',
      success: (res) => {
        if (res.confirm && res.content?.trim()) {
          const content = res.content.trim();
          const match = content.match(/^(.+?)\s+(.+)$/);
          if (match) {
            updateTracking(order.id, match[2], match[1]);
          } else {
            updateTracking(order.id, content, '快递');
          }
          markShipped(order.id);
          Taro.showToast({ title: '已标记发货', icon: 'success' });
        }
      }
    });
  };

  const handleToggleFavorite = () => {
    updateOrder(order.id, { isFavorite: !order.isFavorite });
    Taro.showToast({
      title: order.isFavorite ? '已取消收藏' : '已收藏',
      icon: 'none'
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.heroCard}>
        <View className={styles.heroTitleRow}>
          <Text className={styles.heroTitle}>{order.title}</Text>
          <Text
            className={styles.favIcon}
            onClick={handleToggleFavorite}
          >
            {order.isFavorite ? '⭐' : '☆'}
          </Text>
        </View>
        <View className={styles.heroSeriesRow}>
          {order.series && <Text className={styles.seriesChip}>📺 {order.series}</Text>}
          {order.character && <Text className={styles.seriesChip}>👤 {order.character}</Text>}
          {order.maker && <Text className={styles.seriesChip}>🏭 {order.maker}</Text>}
          {order.scale && <Text className={styles.seriesChip}>📐 {order.scale}</Text>}
          {order.isDelayed && <Text className={styles.seriesChip} style={{ background: 'rgba(239,68,68,0.3)' }}>
            ⚠️ 延期{order.delayTimes}次
          </Text>}
        </View>
        <View>
          <Text className={styles.heroPriceLabel}>总金额</Text>
          <Text className={styles.heroPrice}>¥{order.totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>💳 付款记录</Text>
        </View>
        {order.payments.map(payment => (
          <View key={payment.id} className={styles.paymentItem}>
            <View className={styles.paymentHeader}>
              <View className={styles.paymentType}>
                <StatusTag type={payment.status} size="sm" />
                <Text className={styles.paymentTypeText}>
                  {payment.type === 'deposit' ? '订金' : payment.type === 'balance' ? '尾款' : '其他'}
                </Text>
              </View>
              <Text className={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
            </View>
            <View className={styles.paymentMeta}>
              <Text>
                {payment.status === 'paid'
                  ? `支付时间: ${payment.paidAt || '—'}`
                  : `到期时间: ${payment.dueDate || '待定'}`}
              </Text>
              {payment.reminder && payment.status === 'unpaid' && <Text>🔔 已开启提醒</Text>}
            </View>
            {payment.status === 'unpaid' && (
              <View className={styles.paymentAction}>
                <Button
                  className={styles.btnPay}
                  onClick={() => handleMarkPaymentPaid(payment.id)}
                >
                  标记已付款
                </Button>
              </View>
            )}
          </View>
        ))}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>⏱️ 进度追踪</Text>
        </View>
        <View className={styles.timeline}>
          {timeline.map((step, idx) => (
            <View key={step.key} className={styles.timelineItem}>
              <View className={styles.timelineDotWrap}>
                <View
                  className={classnames(
                    styles.timelineDot,
                    step.active && styles.timelineDotActive
                  )}
                />
                {idx < timeline.length - 1 && <View className={styles.timelineLine} />}
              </View>
              <View className={styles.timelineContent}>
                <Text className={classnames(
                  styles.timelineTitle,
                  !step.active && styles.timelineTitleDone
                )}>
                  {step.label}
                </Text>
                {step.time && <Text className={styles.timelineTime}>{step.time}</Text>}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📋 订单详情</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>预订店铺</Text>
          <Text className={styles.infoValue}>
            {order.shopName}
            {shop?.platform ? ` (${shop.platform})` : ''}
          </Text>
        </View>
        {order.orderNo && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>订单编号</Text>
            <Text className={styles.infoValue} selectable>{order.orderNo}</Text>
          </View>
        )}
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>预计发售</Text>
          <Text className={classnames(
            styles.infoValue,
            order.isDelayed && styles.infoValueWarn
          )}>
            {formatMonth(order.actualMonth || order.expectedMonth)}
            {order.isDelayed && ' (已延期)'}
          </Text>
        </View>
        {order.trackingNo && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>物流信息</Text>
            <Text className={styles.infoValue} selectable>
              {order.shippingCarrier ? `${order.shippingCarrier} ` : ''}{order.trackingNo}
            </Text>
          </View>
        )}
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>订金</Text>
          <Text className={styles.infoValueHighlight}>{formatCurrency(order.deposit)}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>尾款</Text>
          <Text className={styles.infoValueHighlight}>{formatCurrency(order.balance)}</Text>
        </View>
      </View>

      {order.photos.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>📷 开箱照片</Text>
            <Text className={styles.sectionAction}>共{order.photos.length}张</Text>
          </View>
          <View className={styles.photoGrid}>
            {order.photos.map(photo => (
              <Image
                key={photo.id}
                className={styles.photoItem}
                src={photo.url}
                mode="aspectFill"
                onClick={() => Taro.previewImage({
                  urls: order.photos.map(p => p.url),
                  current: photo.url
                })}
              />
            ))}
          </View>
        </View>
      )}

      {order.issues.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>⚠️ 验收问题</Text>
          </View>
          {order.issues.map(issue => (
            <View key={issue.id} className={styles.issueItem}>
              <View className={styles.issueHeader}>
                <View className={styles.issueType}>
                  {issue.type === 'missing' && '❓ 缺件'}
                  {issue.type === 'damaged' && '⚠️ 破损'}
                  {issue.type === 'other' && '💬 其他'}
                </View>
                <Text
                  className={classnames(
                    'statusTag',
                    issue.resolved ? 'statusResolved' : 'statusOpen'
                  )}
                  style={{
                    padding: '4rpx 14rpx',
                    borderRadius: '8rpx',
                    fontSize: '22rpx',
                    fontWeight: 600,
                    background: issue.resolved ? '#D1FAE5' : '#EF4444',
                    color: issue.resolved ? '#10B981' : '#FFFFFF'
                  }}
                >
                  {issue.resolved ? '已解决' : '待处理'}
                </Text>
              </View>
              <Text className={styles.issueDesc}>{issue.description}</Text>
              <View className={styles.issueFooter}>
                <Text>登记时间: {issue.createdAt.slice(0, 10)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {(order.customerNotes || order.internalNotes) && (
        <View className={styles.section}>
          {order.customerNotes && (
            <View style={{ marginBottom: '24rpx' }}>
              <View className={styles.sectionHeader} style={{ borderBottom: 'none', padding: '24rpx 24rpx 0' }}>
                <Text className={styles.sectionTitle}>💬 客服沟通备注</Text>
              </View>
              <View className={styles.notesBox} style={{ marginTop: 0 }}>
                <Text>{order.customerNotes}</Text>
              </View>
            </View>
          )}
          {order.internalNotes && (
            <View>
              <View className={styles.sectionHeader} style={{ borderBottom: 'none', padding: '0 24rpx 0' }}>
                <Text className={styles.sectionTitle}>📝 个人备注</Text>
              </View>
              <View className={styles.notesBox}>
                <Text>{order.internalNotes}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View className={styles.bottomBar}>
        <Button className={classnames(styles.btn, styles.btnOutline)} onClick={handleEdit}>
          编辑
        </Button>
        {order.status === 'balance_paid' && (
          <Button className={classnames(styles.btn, styles.btnPrimary)} onClick={handleMarkShipped}>
            录入发货
          </Button>
        )}
        {order.status === 'shipping' && (
          <Button className={classnames(styles.btn, styles.btnPrimary)} onClick={handleMarkDelivered}>
            确认签收
          </Button>
        )}
        {order.status === 'delivered' && (
          <Button className={classnames(styles.btn, styles.btnPrimary)} onClick={handleGoInspect}>
            开箱验收
          </Button>
        )}
        {!['balance_paid', 'shipping', 'delivered'].includes(order.status) && (
          <Button className={classnames(styles.btn, styles.btnPrimary)} onClick={handleGoInspect}>
            验收记录
          </Button>
        )}
      </View>
    </ScrollView>
  );
};

export default OrderDetailPage;
