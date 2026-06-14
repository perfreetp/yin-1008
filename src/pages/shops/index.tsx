import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
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
  orders: PreOrder[];
  totalAmount: number;
  pendingAmount: number;
}

const ShopsPage: React.FC = () => {
  const { orders, shops, initStore, initialized, addShop } = useOrderStore();

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
    return shops.map(shop => {
      const shopOrders = orders.filter(o => o.shopId === shop.id);
      const totalAmount = shopOrders.reduce((s, o) => s + o.totalPrice, 0);
      const pendingAmount = shopOrders.reduce((s, o) => {
        const unpaid = o.payments
          .filter(p => p.status === 'unpaid')
          .reduce((ps, p) => ps + p.amount, 0);
        return s + unpaid;
      }, 0);
      return {
        ...shop,
        orders: shopOrders,
        totalAmount,
        pendingAmount
      };
    }).sort((a, b) => b.orders.length - a.orders.length);
  }, [shops, orders]);

  const overview = useMemo(() => {
    const totalPending = shopsWithOrders.reduce((s, sh) => s + sh.pendingAmount, 0);
    const totalOrderCount = orders.length;
    const totalShopCount = shops.length;
    return { totalPending, totalOrderCount, totalShopCount };
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
                </View>
              </View>

              {shop.notes && (
                <View className={styles.shopSection}>
                  <Text className={styles.sectionLabel}>📝 店铺备注</Text>
                  <View className={styles.shopNotes}>
                    <Text>{shop.notes}</Text>
                  </View>
                </View>
              )}

              {shop.orders.length > 0 && (
                <View className={styles.shopSection}>
                  <Text className={styles.sectionLabel}>
                    📦 订单记录
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
