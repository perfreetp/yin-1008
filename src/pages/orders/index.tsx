import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Input, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import OrderCard from '@/components/OrderCard';
import EmptyState from '@/components/EmptyState';
import type { OrderStatus } from '@/types/order';

interface FilterOption {
  key: 'all' | OrderStatus;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: '全部' },
  { key: 'waiting_balance', label: '待补款' },
  { key: 'delayed', label: '已延期' },
  { key: 'shipping', label: '运输中' },
  { key: 'delivered', label: '待验收' },
  { key: 'accepted', label: '已完成' }
];

const OrdersPage: React.FC = () => {
  const {
    orders,
    initStore,
    initialized
  } = useOrderStore();

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!initialized) {
      initStore();
    }
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) {
      initStore();
    }
  });

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
    }, 500);
  });

  const stats = useMemo(() => {
    return {
      total: orders.length,
      waitingBalance: orders.filter(
        o => o.status === 'waiting_balance' || o.status === 'delayed'
      ).length,
      shipping: orders.filter(
        o => o.status === 'shipping' || o.status === 'balance_paid' || o.status === 'delivered'
      ).length,
      accepted: orders.filter(o => o.status === 'accepted').length,
      pendingAmount: orders.reduce((sum, o) => {
        const unpaid = o.payments.filter(
          p => p.status === 'unpaid'
        ).reduce((s, p) => s + p.amount, 0);
        return sum + unpaid;
      }, 0)
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeFilter !== 'all') {
      list = list.filter(o => o.status === activeFilter);
    }
    if (searchText.trim()) {
      const kw = searchText.trim().toLowerCase();
      list = list.filter(o =>
        o.title.toLowerCase().includes(kw) ||
        (o.character || '').toLowerCase().includes(kw) ||
        (o.series || '').toLowerCase().includes(kw) ||
        (o.shopName || '').toLowerCase().includes(kw)
      );
    }
    return list.sort((a, b) => {
      const statusPriority = {
        delayed: 0,
        waiting_balance: 1,
        balance_paid: 2,
        shipping: 3,
        delivered: 4,
        deposit_paid: 5,
        accepted: 6,
        cancelled: 7
      };
      return (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9);
    });
  }, [orders, activeFilter, searchText]);

  const filterCounts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    FILTER_OPTIONS.forEach(opt => {
      if (opt.key !== 'all') {
        map[opt.key] = orders.filter(o => o.status === opt.key).length;
      }
    });
    return map;
  }, [orders]);

  const goToAdd = () => {
    Taro.navigateTo({ url: '/pages/order-edit/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.hero}>
        <Text className={styles.heroTitle}>手办预订追踪</Text>
        <Text className={styles.heroSubtitle}>
          共 {stats.total} 笔预订 · 待付 ¥{stats.pendingAmount.toFixed(2)}
        </Text>
      </View>

      <View className={styles.statsGrid}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.total}</Text>
          <Text className={styles.statLabel}>总预订</Text>
        </View>
        <View className={classnames(styles.statItem, styles.statWarning)}>
          <Text className={styles.statValue}>{stats.waitingBalance}</Text>
          <Text className={styles.statLabel}>待补款</Text>
        </View>
        <View className={classnames(styles.statItem, styles.statInfo)}>
          <Text className={styles.statValue}>{stats.shipping}</Text>
          <Text className={styles.statLabel}>运输/待收</Text>
        </View>
        <View className={classnames(styles.statItem, styles.statSuccess)}>
          <Text className={styles.statValue}>{stats.accepted}</Text>
          <Text className={styles.statLabel}>已验收</Text>
        </View>
      </View>

      <View className={styles.searchBar}>
        <View className={styles.searchInput}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            type="text"
            placeholder="搜索作品、角色、店铺..."
            className={styles.searchText}
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.filterBar}>
        <ScrollView scrollX className={styles.filterScroll} enhanced showScrollbar={false}>
          {FILTER_OPTIONS.map(opt => (
            <View
              key={opt.key}
              className={classnames(
                styles.filterChip,
                activeFilter === opt.key && styles.filterChipActive
              )}
              onClick={() => setActiveFilter(opt.key)}
            >
              <Text className={styles.chipText}>{opt.label}</Text>
              <Text className={styles.chipCount}>{filterCounts[opt.key] || 0}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.orderList}>
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : (
          <EmptyState
            emoji="📋"
            title="暂无预订订单"
            description={searchText ? '没有找到匹配的订单' : '点击右下角 + 添加你的第一笔手办预订'}
            buttonText={!searchText ? '添加预订' : undefined}
            onButtonClick={!searchText ? goToAdd : undefined}
          />
        )}
      </View>

      <Button className={styles.fab} onClick={goToAdd}>
        <Text className={styles.fabIcon}>+</Text>
      </Button>
    </View>
  );
};

export default OrdersPage;
