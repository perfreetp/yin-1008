import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/utils/storage';

type RiskLevel = 'high' | 'medium' | 'low';
type FilterRisk = 'all' | 'high' | 'medium';

const getRiskLevel = (amount: number, daysDiff: number): RiskLevel => {
  if (amount > 500 && daysDiff <= 15) return 'high';
  if (amount > 200 && daysDiff <= 30) return 'medium';
  return 'low';
};

const ReminderCenterPage: React.FC = () => {
  const { orders, shops, monthlyBudgets, initStore, initialized, togglePaymentReminder, deferPayment, markPaymentPaid } = useOrderStore();
  const [filterShop, setFilterShop] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<FilterRisk>('all');
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
        .map(p => {
          const daysDiff = dayjs(p.dueDate).diff(now, 'day');
          const riskLevel = getRiskLevel(p.amount, daysDiff);
          return {
            orderId: o.id,
            orderTitle: o.title,
            shopId: o.shopId,
            shopName: o.shopName,
            paymentId: p.id,
            type: p.type,
            amount: p.amount,
            dueDate: p.dueDate!,
            reminder: p.reminder,
            daysDiff,
            riskLevel,
            month: p.dueDate!.slice(0, 7)
          };
        })
    ).sort((a, b) => a.daysDiff - b.daysDiff);
  }, [orders]);

  const monthBudgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyBudgets.forEach(b => {
      map[b.month] = b.limit;
    });
    return map;
  }, [monthlyBudgets]);

  const monthTotalMap = useMemo(() => {
    const map: Record<string, number> = {};
    allReminders.forEach(r => {
      if (!map[r.month]) map[r.month] = 0;
      map[r.month] += r.amount;
    });
    return map;
  }, [allReminders]);

  const isMonthOverBudget = (month: string): boolean => {
    const limit = monthBudgetMap[month];
    const total = monthTotalMap[month] || 0;
    return limit > 0 && total > limit;
  };

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
    if (filterRisk !== 'all') {
      list = list.filter(r => r.riskLevel === filterRisk);
    }
    if (onlyReminder) {
      list = list.filter(r => r.reminder);
    }
    return list;
  }, [allReminders, filterShop, filterMonth, filterRisk, onlyReminder]);

  const highRiskReminders = useMemo(() => {
    return filteredReminders.filter(r => r.riskLevel === 'high' && r.reminder);
  }, [filteredReminders]);

  const reminderCount = allReminders.filter(r => r.reminder).length;
  const overdueCount = allReminders.filter(r => r.daysDiff < 0 && r.reminder).length;
  const highRiskCount = allReminders.filter(r => r.riskLevel === 'high' && r.reminder).length;

  const nonHighRiskReminders = useMemo(() => {
    return filteredReminders.filter(r => !(r.riskLevel === 'high' && r.reminder));
  }, [filteredReminders]);

  const groupedByDate = useMemo(() => {
    const map: Record<string, typeof nonHighRiskReminders> = {};
    nonHighRiskReminders.forEach(r => {
      const key = r.dueDate;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [nonHighRiskReminders]);

  const handleShowActions = (item: typeof allReminders[0], e: React.MouseEvent) => {
    e.stopPropagation();
    Taro.showActionSheet({
      itemList: ['标记已付', '延期30天', '自定义延期日期', '关闭提醒'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            Taro.showModal({
              title: '标记已付',
              content: `确定将 "${item.orderTitle}" 的${item.type === 'deposit' ? '订金' : '尾款'}标记为已付？`,
              success: (r) => {
                if (r.confirm) {
                  markPaymentPaid(item.orderId, item.paymentId);
                  Taro.showToast({ title: '已标记', icon: 'success' });
                }
              }
            });
            break;
          case 1:
            const newDate30 = dayjs(item.dueDate).add(30, 'day').format('YYYY-MM-DD');
            Taro.showModal({
              title: '延期30天',
              content: `将到期日从 ${dayjs(item.dueDate).format('M月D日')} 延期至 ${dayjs(newDate30).format('M月D日')}？`,
              success: (r) => {
                if (r.confirm) {
                  deferPayment(item.orderId, item.paymentId, '延期30天', newDate30);
                  Taro.showToast({ title: '已延期', icon: 'success' });
                }
              }
            });
            break;
          case 2:
            Taro.showModal({
              title: '自定义延期日期',
              editable: true,
              placeholderText: '请输入日期，如：2025-08-15',
              content: item.dueDate,
              success: (r) => {
                if (r.confirm && r.content?.trim()) {
                  const dateStr = r.content.trim();
                  if (dayjs(dateStr).isValid()) {
                    const newDate = dayjs(dateStr).format('YYYY-MM-DD');
                    deferPayment(item.orderId, item.paymentId, '自定义延期', newDate);
                    Taro.showToast({ title: '已延期', icon: 'success' });
                  } else {
                    Taro.showToast({ title: '日期格式不正确', icon: 'none' });
                  }
                }
              }
            });
            break;
          case 3:
            Taro.showModal({
              title: '关闭提醒',
              content: `确定关闭 "${item.orderTitle}" 的付款提醒？`,
              success: (r) => {
                if (r.confirm) {
                  togglePaymentReminder(item.orderId, item.paymentId);
                  Taro.showToast({ title: '已关闭', icon: 'success' });
                }
              }
            });
            break;
        }
      }
    });
  };

  const handleJumpToHighRisk = () => {
    setFilterRisk('high');
    setOnlyReminder(true);
  };

  const renderRiskBadge = (riskLevel: RiskLevel) => {
    const badgeClass = classnames(
      styles.riskBadge,
      riskLevel === 'high' && styles.riskHigh,
      riskLevel === 'medium' && styles.riskMedium,
      riskLevel === 'low' && styles.riskLow
    );
    const label = riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低';
    return (
      <View className={badgeClass}>
        <View className={styles.riskDot} />
        <Text className={styles.riskLabel}>{label}</Text>
      </View>
    );
  };

  const renderReminderItem = (item: typeof allReminders[0]) => {
    const overBudget = isMonthOverBudget(item.month);
    return (
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
            <View className={styles.reminderTitleRow}>
              <Text className={styles.reminderTitle}>{item.orderTitle}</Text>
              {renderRiskBadge(item.riskLevel)}
            </View>
            <Text className={styles.reminderMeta}>
              {item.shopName} · {item.type === 'deposit' ? '订金' : '尾款'}
              {item.daysDiff >= 0 ? ` · 还有${item.daysDiff}天` : ` · 超期${-item.daysDiff}天`}
            </Text>
            {overBudget && (
              <View className={styles.budgetWarning}>
                <Text className={styles.budgetWarningText}>⚠️ 预算紧张</Text>
              </View>
            )}
          </View>
        </View>
        <View className={styles.reminderRight}>
          <Text className={classnames(
            styles.reminderAmount,
            item.reminder ? styles.amountOn : styles.amountOff
          )}>
            {formatCurrency(item.amount)}
          </Text>
          <View className={styles.actionButtons}>
            <View
              className={styles.deferBtn}
              onClick={(e) => handleShowActions(item, e)}
            >
              <Text className={styles.deferBtnText}>延期</Text>
            </View>
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
      </View>
    );
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>🔔 提醒中心</Text>
        <Text className={styles.headerSub}>
          未来30天 · {reminderCount}项提醒{overdueCount > 0 ? ` · ${overdueCount}项超期` : ''}
        </Text>
      </View>

      {highRiskCount > 0 && (
        <View className={styles.highRiskShortcut} onClick={handleJumpToHighRisk}>
          <View className={styles.shortcutLeft}>
            <Text className={styles.shortcutEmoji}>🔥</Text>
            <View className={styles.shortcutInfo}>
              <Text className={styles.shortcutTitle}>高风险付款</Text>
              <Text className={styles.shortcutDesc}>共 {highRiskCount} 笔需重点关注</Text>
            </View>
          </View>
          <View className={styles.shortcutBtn}>
            <Text className={styles.shortcutBtnText}>一键只看高风险</Text>
          </View>
        </View>
      )}

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

      <View className={styles.filterBar}>
        <ScrollView scrollX enhanced showScrollbar={false} className={styles.filterScroll}>
          <View
            className={classnames(styles.chip, filterRisk === 'all' && styles.chipActive)}
            onClick={() => setFilterRisk('all')}
          >
            <Text>全部风险</Text>
          </View>
          <View
            className={classnames(styles.chip, styles.chipRisk, filterRisk === 'high' && styles.chipRiskHighActive)}
            onClick={() => setFilterRisk('high')}
          >
            <Text>🔥 高风险</Text>
          </View>
          <View
            className={classnames(styles.chip, styles.chipRiskMedium, filterRisk === 'medium' && styles.chipRiskMediumActive)}
            onClick={() => setFilterRisk('medium')}
          >
            <Text>🟠 中风险</Text>
          </View>
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
        {highRiskReminders.length > 0 && (
          <View className={styles.highRiskSection}>
            <View className={styles.highRiskHeader}>
              <Text className={styles.highRiskTitle}>🔥 高风险付款</Text>
              <Text className={styles.highRiskCount}>{highRiskReminders.length}笔</Text>
            </View>
            {highRiskReminders.map(item => renderReminderItem(item))}
          </View>
        )}

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
                {items.map(item => renderReminderItem(item))}
              </View>
            );
          })
        ) : highRiskReminders.length === 0 ? (
          <EmptyState
            emoji={onlyReminder ? '🔕' : '🎉'}
            title={onlyReminder ? '没有开启提醒的付款' : '未来30天无待付款'}
            description={onlyReminder ? '开启提醒后会在这里显示' : '所有款项已安排妥当'}
          />
        ) : null}
      </View>
    </View>
  );
};

export default ReminderCenterPage;
