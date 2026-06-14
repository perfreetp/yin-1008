import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Switch, Button } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/utils/storage';

const ReminderCenterPage: React.FC = () => {
  const { orders, shops, initStore, initialized, togglePaymentReminder } = useOrderStore();
  const [filterShop, setFilterShop] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [onlyReminder, setOnlyReminder] = useState(false);

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  const allReminders = useMemo(() => {
    const now = dayjs();
    const limit = now.add(30, 'day');
    return orders.flatMap(o =>
      o.payments
        .filter(p => p.status === 'unpaid' && p.dueDate && dayjs(p.dueDate).isBefore(limit))
        .map(p => ({
          orderId: o.id,
          orderTitle: o.title,
          shopId: o.shopId,
          shopName: o.shopName,
          paymentId: p.id,
          type: p.type,
          amount: p.amount,
          dueDate: p.dueDate!,
          reminder: p.reminder,
          daysDiff: dayjs(p.dueDate).diff(now, 'day')
        }))
    ).sort((a, b) => a.daysDiff - b.daysDiff);
  }, [orders]);

  const availableShops = useMemo(() => {
    const ids = [...new Set(allReminders.map(r => r.shopId))];
    return shops.filter(s => ids.includes(s.id));
  }, [allReminders, shops]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(allReminders.map(r => r.dueDate.slice(0, 7)))];
    return months.sort();
  }, [allReminders]);

  const filteredReminders = useMemo(() => {
    let list = allReminders;
    if (filterShop !== 'all') {
      list = list.filter(r => r.shopId === filterShop);
    }
    if (filterMonth !== 'all') {
      list = list.filter(r => r.dueDate.startsWith(filterMonth));
    }
    if (onlyReminder) {
      list = list.filter(r => r.reminder);
    }
    return list;
  }, [allReminders, filterShop, filterMonth, onlyReminder]);

  const reminderCount = allReminders.filter(r => r.reminder).length;
  const overdueCount = allReminders.filter(r => r.daysDiff < 0 && r.reminder).length;

  const groupedByDate = useMemo(() => {
    const map: Record<string, typeof filteredReminders> = {};
    filteredReminders.forEach(r => {
      const key = r.dueDate;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredReminders]);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>🔔 提醒中心</Text>
        <Text className={styles.headerSub}>
          未来30天 · {reminderCount}项提醒{overdueCount > 0 ? ` · ${overdueCount}项超期` : ''}
        </Text>
      </View>

      <View className={styles.filterBar}>
        <ScrollView scrollX enhanced showScrollbar={false} className={styles.filterScroll}>
          <View
            className={classnames(styles.chip, filterShop === 'all' && styles.chipActive)}
            onClick={() => setFilterShop('all')}
          >
            <Text>全部店铺</Text>
          </View>
          {availableShops.map(s => (
            <View
              key={s.id}
              className={classnames(styles.chip, filterShop === s.id && styles.chipActive)}
              onClick={() => setFilterShop(s.id)}
            >
              <Text>{s.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.filterBar}>
        <ScrollView scrollX enhanced showScrollbar={false} className={styles.filterScroll}>
          <View
            className={classnames(styles.chip, filterMonth === 'all' && styles.chipActive)}
            onClick={() => setFilterMonth('all')}
          >
            <Text>全部月份</Text>
          </View>
          {availableMonths.map(m => (
            <View
              key={m}
              className={classnames(styles.chip, filterMonth === m && styles.chipActive)}
              onClick={() => setFilterMonth(m)}
            >
              <Text>{dayjs(m + '-01').format('M月')}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.reminderToggle}>
        <Text className={styles.reminderToggleLabel}>只看已开启提醒</Text>
        <Switch
          checked={onlyReminder}
          onChange={() => setOnlyReminder(!onlyReminder)}
          color="#8B5CF6"
        />
      </View>

      <View className={styles.listContent}>
        {groupedByDate.length > 0 ? (
          groupedByDate.map(([date, items]) => {
            const isOverdue = dayjs(date).isBefore(dayjs(), 'day');
            const isToday = date === dayjs().format('YYYY-MM-DD');
            const dateLabel = isToday ? '今天' : isOverdue ? `已超期 · ${dayjs(date).format('M月D日')}` : dayjs(date).format('M月D日');
            return (
              <View key={date} className={styles.dateGroup}>
                <View className={classnames(
                  styles.dateHeader,
                  isOverdue && styles.dateOverdue,
                  isToday && styles.dateToday
                )}>
                  <Text className={styles.dateLabel}>{dateLabel}</Text>
                  <Text className={styles.dateCount}>{items.length}笔</Text>
                </View>
                {items.map(item => (
                  <View
                    key={`${item.orderId}-${item.paymentId}`}
                    className={styles.reminderItem}
                    onClick={() => Taro.navigateTo({
                      url: `/pages/order-detail/index?id=${item.orderId}`
                    })}
                  >
                    <View className={styles.reminderLeft}>
                      <View className={classnames(
                        styles.reminderDot,
                        item.reminder ? styles.dotOn : styles.dotOff
                      )} />
                      <View className={styles.reminderInfo}>
                        <Text className={styles.reminderTitle}>{item.orderTitle}</Text>
                        <Text className={styles.reminderMeta}>
                          {item.shopName} · {item.type === 'deposit' ? '订金' : '尾款'}
                          {item.daysDiff >= 0 ? ` · 还有${item.daysDiff}天` : ` · 超期${-item.daysDiff}天`}
                        </Text>
                      </View>
                    </View>
                    <View className={styles.reminderRight}>
                      <Text className={classnames(
                        styles.reminderAmount,
                        item.reminder ? styles.amountOn : styles.amountOff
                      )}>
                        {formatCurrency(item.amount)}
                      </Text>
                      <Switch
                        checked={item.reminder}
                        onChange={(e) => {
                          e.stopPropagation && e.stopPropagation();
                          togglePaymentReminder(item.orderId, item.paymentId);
                        }}
                        color="#8B5CF6"
                        style={{ transform: 'scale(0.7)' }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        ) : (
          <EmptyState
            emoji={onlyReminder ? '🔕' : '🎉'}
            title={onlyReminder ? '没有开启提醒的付款' : '未来30天无待付款'}
            description={onlyReminder ? '开启提醒后会在这里显示' : '所有款项已安排妥当'}
          />
        )}
      </View>
    </View>
  );
};

export default ReminderCenterPage;
