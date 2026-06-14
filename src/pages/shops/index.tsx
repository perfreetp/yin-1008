import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { useOrderStore } from '@/store/useOrderStore';
import EmptyState from '@/components/EmptyState';
import StatusTag from '@/components/StatusTag';
import { formatCurrency, formatMonth } from '@/utils/storage';
import type { PreOrder } from '@/types/order';

interface ShopWithOrders {
  id: string;
  name: string;
  platform: string;
  contact?: string;
  notes?: string;
  balanceRule?: string;
  advanceNoticeDays?: number;
  orders: PreOrder[];
  totalAmount: number;
  pendingAmount: number;
  nearDueOrders: PreOrder[];
}

const ShopsPage: React.FC = () => {
  const { orders, shops, initStore, initialized, addShop, updateShop, deleteShop } = useOrderStore();

  const [expandedShop, setExpandedShop] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  usePullDownRefresh(() => {
    setTimeout(() => Taro.stopPullDownRefresh(), 500);
  });

  const shopsWithOrders = useMemo((): ShopWithOrders[] => {
    const now = dayjs();
    return shops.map(shop => {
      const shopOrders = orders.filter(o => o.shopId === shop.id);
      const totalAmount = shopOrders.reduce((s, o) => s + o.totalPrice, 0);
      const pendingAmount = shopOrders.reduce((s, o) => {
        const unpaid = o.payments
          .filter(p => p.status === 'unpaid')
          .reduce((ps, p) => ps + p.amount, 0);
        return s + unpaid;
      }, 0);
      const advanceDays = shop.advanceNoticeDays || 30;
      const nearDueOrders = shopOrders.filter(o => {
        return o.payments.some(p => {
          if (p.status !== 'unpaid' || !p.dueDate) return false;
          const daysDiff = dayjs(p.dueDate).diff(now, 'day');
          return daysDiff >= 0 && daysDiff <= advanceDays;
        });
      }).sort((a, b) => {
        const aDue = a.payments.find(p => p.status === 'unpaid' && p.dueDate)?.dueDate || '';
        const bDue = b.payments.find(p => p.status === 'unpaid' && p.dueDate)?.dueDate || '';
        return aDue.localeCompare(bDue);
      });
      return {
        ...shop,
        orders: shopOrders,
        totalAmount,
        pendingAmount,
        nearDueOrders
      };
    }).sort((a, b) => b.orders.length - a.orders.length);
  }, [shops, orders]);

  const overview = useMemo(() => {
    const totalPending = shopsWithOrders.reduce((s, sh) => s + sh.pendingAmount, 0);
    const totalOrderCount = orders.length;
    const totalShopCount = shops.length;
    const totalNearDue = shopsWithOrders.reduce((s, sh) => s + sh.nearDueOrders.length, 0);
    return { totalPending, totalOrderCount, totalShopCount, totalNearDue };
  }, [shopsWithOrders, orders, shops]);

  const handleAddShop = () => {
    Taro.showModal({
      title: '添加店铺',
      editable: true,
      placeholderText: '请输入店铺名称',
      success: async (res) => {
        if (res.confirm && res.content?.trim()) {
          addShop({ name: res.content.trim() });
          Taro.showToast({ title: '店铺已添加', icon: 'success' });
        }
      }
    });
  };

  const handleEditShop = (shop: ShopWithOrders) => {
    Taro.showActionSheet({
      itemList: ['修改平台', '修改联系方式', '修改备注', '修改补款规则', '删除店铺'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            Taro.showModal({
              title: '修改平台',
              editable: true,
              placeholderText: '如：淘宝、京东、官网',
              content: shop.platform,
              success: (r) => {
                if (r.confirm && r.content?.trim()) {
                  updateShop(shop.id, { platform: r.content.trim() });
                  Taro.showToast({ title: '已更新', icon: 'success' });
                }
              }
            });
            break;
          case 1:
            Taro.showModal({
              title: '修改联系方式',
              editable: true,
              placeholderText: '如：旺旺客服、QQ群号',
              content: shop.contact || '',
              success: (r) => {
                if (r.confirm) {
                  updateShop(shop.id, { contact: r.content?.trim() || '' });
                  Taro.showToast({ title: '已更新', icon: 'success' });
                }
              }
            });
            break;
          case 2:
            Taro.showModal({
              title: '修改备注',
              editable: true,
              placeholderText: '记录店铺相关备注',
              content: shop.notes || '',
              success: (r) => {
                if (r.confirm) {
                  updateShop(shop.id, { notes: r.content?.trim() || '' });
                  Taro.showToast({ title: '已更新', icon: 'success' });
                }
              }
            });
            break;
          case 3:
            Taro.showModal({
              title: '修改补款规则',
              editable: true,
              placeholderText: '如：到货后7天内补齐尾款',
              content: shop.balanceRule || '',
              success: (r) => {
                if (r.confirm && r.content?.trim()) {
                  updateShop(shop.id, { balanceRule: r.content.trim() });
                  Taro.showToast({ title: '已更新', icon: 'success' });
                }
              }
            });
            break;
          case 4:
            Taro.showModal({
              title: '删除店铺',
              content: `确定删除"${shop.name}"？店铺下的订单不会被删除。`,
              confirmColor: '#EF4444',
              success: (r) => {
                if (r.confirm) {
                  deleteShop(shop.id);
                  Taro.showToast({ title: '已删除', icon: 'success' });
                }
              }
            });
            break;
        }
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.overviewWrap}>
        <Text className={styles.overviewTitle}>合作店铺一览</Text>
        <View className={styles.overviewStats}>
          <View className={styles.overviewStat}>
            <Text className={styles.overviewStatValue}>{overview.totalShopCount}</Text>
            <Text className={styles.overviewStatLabel}>合作店铺</Text>
          </View>
          <View className={styles.overviewStat}>
            <Text className={styles.overviewStatValue}>{overview.totalOrderCount}</Text>
            <Text className={styles.overviewStatLabel}>总预订数</Text>
          </View>
          <View className={styles.overviewStat}>
            <Text className={styles.overviewStatValue}>¥{overview.totalPending.toFixed(0)}</Text>
            <Text className={styles.overviewStatLabel}>待付总额</Text>
          </View>
        </View>
      </View>

      {overview.totalNearDue > 0 && (
        <View className={styles.nearDueBanner} style={{
          margin: '0 32rpx 16rpx',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.2) 100%)',
          borderRadius: '16rpx',
          padding: '24rpx',
          border: '1rpx solid rgba(245,158,11,0.3)'
        }}>
          <Text style={{ fontSize: '26rpx', color: '#D97706', fontWeight: 600 }}>
            ⏰ {overview.totalNearDue} 笔订单即将到补款时间
          </Text>
        </View>
      )}

      <View className={styles.shopList}>
        {shopsWithOrders.length > 0 ? (
          shopsWithOrders.map(shop => (
            <View key={shop.id} className={styles.shopCard}>
              <View className={styles.shopHeader}>
                <View className={styles.shopInfo}>
                  <View className={styles.shopNameRow}>
                    <Text className={styles.shopName}>{shop.name}</Text>
                    {shop.platform && (
                      <View className={styles.shopPlatform}>
                        <Text className={styles.shopPlatformText}>{shop.platform}</Text>
                      </View>
                    )}
                  </View>
                  {shop.contact && (
                    <Text className={styles.shopContact}>
                      📞 {shop.contact}
                    </Text>
                  )}
                </View>
                <View className={styles.shopOrderStats}>
                  <View className={styles.orderCountBadge}>
                    <Text className={styles.orderCountText}>{shop.orders.length} 笔订单</Text>
                  </View>
                  <Text className={styles.orderTotalAmount}>
                    总{formatCurrency(shop.totalAmount)}
                  </Text>
                  <Text
                    style={{ fontSize: '22rpx', color: '#8B5CF6', marginTop: '4rpx' }}
                    onClick={() => handleEditShop(shop)}
                  >
                    管理 ›
                  </Text>
                </View>
              </View>

              {shop.balanceRule && (
                <View className={styles.shopSection}>
                  <Text className={styles.sectionLabel}>📋 补款规则</Text>
                  <View className={styles.shopNotes} style={{ background: '#FEF3C7', borderLeft: '6rpx solid #F59E0B' }}>
                    <Text style={{ color: '#92400E' }}>{shop.balanceRule}</Text>
                  </View>
                </View>
              )}

              {shop.notes && (
                <View className={styles.shopSection}>
                  <Text className={styles.sectionLabel}>📝 店铺备注</Text>
                  <View className={styles.shopNotes}>
                    <Text>{shop.notes}</Text>
                  </View>
                </View>
              )}

              {shop.nearDueOrders.length > 0 && (
                <View className={styles.shopSection}>
                  <Text className={styles.sectionLabel} style={{ color: '#D97706' }}>
                    ⏰ 即将补款 ({shop.nearDueOrders.length}笔)
                  </Text>
                  <View className={styles.miniOrders}>
                    {shop.nearDueOrders.map(order => {
                      const unpaidPayment = order.payments.find(p => p.status === 'unpaid' && p.dueDate);
                      const daysDiff = unpaidPayment ? dayjs(unpaidPayment.dueDate).diff(dayjs(), 'day') : null;
                      return (
                        <View
                          key={order.id}
                          className={styles.miniOrderItem}
                          onClick={() => Taro.navigateTo({
                            url: `/pages/order-detail/index?id=${order.id}`
                          })}
                        >
                          <View className={styles.miniOrderInfo}>
                            <Text className={styles.miniOrderTitle}>{order.title}</Text>
                            <Text className={styles.miniOrderMeta}>
                              {unpaidPayment && `尾款 ${formatCurrency(unpaidPayment.amount)}`}
                              {daysDiff !== null && daysDiff >= 0 && ` · 还有${daysDiff}天`}
                              {daysDiff !== null && daysDiff < 0 && ` · 已超期${-daysDiff}天`}
                              {unpaidPayment?.reminder && ' 🔔'}
                            </Text>
                          </View>
                          <StatusTag type={order.status} size="sm" />
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {shop.orders.length > 0 && (
                <View className={styles.shopSection}>
                  <Text className={styles.sectionLabel}>
                    📦 全部订单
                    {shop.pendingAmount > 0 && (
                      <Text style={{ color: '#F59E0B', marginLeft: '10rpx' }}>
                        · 待付{formatCurrency(shop.pendingAmount)}
                      </Text>
                    )}
                  </Text>
                  <View className={styles.miniOrders}>
                    {shop.orders.slice(0, 5).map(order => (
                      <View
                        key={order.id}
                        className={styles.miniOrderItem}
                        onClick={() => Taro.navigateTo({
                          url: `/pages/order-detail/index?id=${order.id}`
                        })}
                      >
                        <View className={styles.miniOrderInfo}>
                          <Text className={styles.miniOrderTitle}>{order.title}</Text>
                          <Text className={styles.miniOrderMeta}>
                            {formatMonth(order.actualMonth || order.expectedMonth)}
                            {' · '}
                            {formatCurrency(order.totalPrice)}
                          </Text>
                        </View>
                        <StatusTag type={order.status} size="sm" />
                      </View>
                    ))}
                    {shop.orders.length > 5 && (
                      <Text style={{
                        fontSize: '24rpx',
                        color: '#8B5CF6',
                        textAlign: 'center',
                        paddingTop: '12rpx'
                      }}>
                        还有 {shop.orders.length - 5} 笔订单 →
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {shop.orders.length === 0 && (
                <View className={styles.shopSection}>
                  <Text className={styles.noOrder}>暂无订单记录</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <EmptyState
            emoji="🏪"
            title="还没有店铺"
            description="点击右下角 + 添加你的手办合作店铺"
            buttonText="添加店铺"
            onButtonClick={handleAddShop}
          />
        )}
      </View>

      <Button className={styles.fab} onClick={handleAddShop}>
        <Text className={styles.fabIcon}>+</Text>
      </Button>
    </View>
  );
};

export default ShopsPage;
