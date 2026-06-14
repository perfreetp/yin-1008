import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import StatusTag from '@/components/StatusTag';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/utils/storage';

interface DayInfo {
  day: number | null;
  isToday: boolean;
  isWeekend: boolean;
  dateStr: string;
  paymentAmount: number;
  paymentCount: number;
  orderIds: string[];
}

const CalendarPage: React.FC = () => {
  const { orders, initStore, initialized } = useOrderStore();
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  usePullDownRefresh(() => {
    setTimeout(() => Taro.stopPullDownRefresh(), 500);
  });

  const navigateMonth = (delta: number) => {
    setCurrentMonth(dayjs(currentMonth + '-01').add(delta, 'month').format('YYYY-MM'));
  };

  const monthPayments = useMemo(() => {
    return orders.flatMap(o =>
      o.payments
        .filter(p => p.status === 'unpaid' && p.dueDate)
        .map(p => ({
          orderId: o.id,
          orderTitle: o.title,
          shopName: o.shopName,
          isDelayed: o.isDelayed,
          delayTimes: o.delayTimes,
          status: o.status,
          hasReminder: p.reminder,
          ...p
        }))
    ).sort((a, b) => {
      const da = dayjs(a.dueDate || '');
      const db = dayjs(b.dueDate || '');
      return da.valueOf() - db.valueOf();
    });
  }, [orders]);

  const currentMonthPayments = useMemo(() => {
    return monthPayments.filter(p => p.dueDate?.startsWith(currentMonth));
  }, [monthPayments, currentMonth]);

  const monthTotal = useMemo(() =>
    currentMonthPayments.reduce((s, p) => s + p.amount, 0)
  , [currentMonthPayments]);

  const upcoming3Months = useMemo(() => {
    const now = dayjs();
    const list: { month: string; total: number; count: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const m = now.add(i, 'month').format('YYYY-MM');
      const items = monthPayments.filter(p => p.dueDate?.startsWith(m));
      list.push({
        month: m,
        total: items.reduce((s, p) => s + p.amount, 0),
        count: items.length
      });
    }
    return list;
  }, [monthPayments]);

  const calendarDays = useMemo((): DayInfo[] => {
    const start = dayjs(currentMonth + '-01');
    const endOfMonth = start.endOf('month');
    const daysInMonth = endOfMonth.date();
    const startWeekday = start.day();
    const today = dayjs().format('YYYY-MM-DD');

    const dayMap: Record<string, { amount: number; count: number; orderIds: string[] }> = {};
    currentMonthPayments.forEach(p => {
      const d = p.dueDate!;
      if (!dayMap[d]) dayMap[d] = { amount: 0, count: 0, orderIds: [] };
      dayMap[d].amount += p.amount;
      dayMap[d].count += 1;
      dayMap[d].orderIds.push(p.orderId);
    });

    const days: DayInfo[] = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push({
        day: null, isToday: false, isWeekend: false, dateStr: '',
        paymentAmount: 0, paymentCount: 0, orderIds: []
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`;
      const date = dayjs(dateStr);
      const isWeekend = date.day() === 0 || date.day() === 6;
      const info = dayMap[dateStr] || { amount: 0, count: 0, orderIds: [] };
      days.push({
        day: d,
        isToday: dateStr === today,
        isWeekend,
        dateStr,
        paymentAmount: info.amount,
        paymentCount: info.count,
        orderIds: info.orderIds
      });
    }
    return days;
  }, [currentMonth, currentMonthPayments]);

  const displayList = useMemo(() => {
    if (selectedDate) {
      return monthPayments.filter(p => p.dueDate === selectedDate);
    }
    return monthPayments;
  }, [monthPayments, selectedDate]);

  const displayMonthStr = dayjs(currentMonth + '-01').format('YYYY年MM月');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  const todayDisplay = dayjs().format('MM月DD日');

  return (
    <View className={styles.page}>
      <View className={styles.monthSelector}>
        <Button className={styles.navBtn} onClick={() => navigateMonth(-1)}>‹</Button>
        <View className={styles.monthTitleWrap}>
          <Text className={styles.monthTitle}>{displayMonthStr}</Text>
          <Text className={styles.monthTotal}>
            待付 ¥{monthTotal.toFixed(2)} · {currentMonthPayments.length}笔
          </Text>
        </View>
        <Button className={styles.navBtn} onClick={() => navigateMonth(1)}>›</Button>
      </View>

      <View className={styles.calendarWrap}>
        <View className={styles.weekdays}>
          {weekdays.map((w, i) => (
            <Text
              key={w}
              className={classnames(
                styles.weekday,
                (i === 0 || i === 6) && styles.weekend
              )}
            >{w}</Text>
          ))}
        </View>
        <View className={styles.daysGrid}>
          {calendarDays.map((info, idx) => {
            if (info.day === null) {
              return <View key={`empty-${idx}`} className={classnames(styles.dayCell, styles.dayEmpty)} />;
            }
            const hasPayment = info.paymentCount > 0;
            const isSelected = selectedDate === info.dateStr;
            return (
              <View
                key={info.dateStr}
                className={classnames(
                  styles.dayCell,
                  styles.dayNormal,
                  info.isWeekend && styles.dayWeekend,
                  info.isToday && styles.dayToday,
                  hasPayment && !isSelected && styles.dayHasPayment,
                  isSelected && styles.daySelected
                )}
                onClick={() => {
                  if (hasPayment) {
                    setSelectedDate(isSelected ? null : info.dateStr);
                  } else if (info.isToday) {
                    setSelectedDate(isSelected ? null : info.dateStr);
                  }
                }}
              >
                <Text className={styles.dayNumber}>{info.day}</Text>
                {hasPayment && <View className={styles.paymentDot} />}
              </View>
            );
          })}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.summaryCard}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>本月待付 ({todayDisplay})</Text>
            <Text className={classnames(styles.summaryValue, styles.summaryHighlight)}>
              ¥{upcoming3Months[0]?.total.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>下月待付</Text>
            <Text className={styles.summaryValue}>
              ¥{upcoming3Months[1]?.total.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryLabel}>下下月</Text>
            <Text className={styles.summaryValue}>
              ¥{upcoming3Months[2]?.total.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View className={classnames(styles.summaryItem, styles.summarySuccess)}>
            <Text className={styles.summaryLabel}>提醒中</Text>
            <Text className={styles.summaryValue}>
              {monthPayments.filter(p => p.reminder).length}笔
            </Text>
          </View>
        </View>
        <View
          style={{
            marginTop: '16rpx',
            padding: '20rpx 24rpx',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.15) 100%)',
            borderRadius: '12rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
          onClick={() => Taro.navigateTo({ url: '/pages/reminder-center/index' })}
        >
          <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
            <Text style={{ fontSize: '32rpx' }}>🔔</Text>
            <Text style={{ fontSize: '26rpx', color: '#8B5CF6', fontWeight: 600 }}>
              提醒中心
            </Text>
          </View>
          <Text style={{ fontSize: '24rpx', color: '#8B5CF6' }}>
            查看30天提醒 ›
          </Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>
            {selectedDate
              ? dayjs(selectedDate).format('MM月DD日') + ' 待付款'
              : '全部待付款'}
          </Text>
          {selectedDate && (
            <Text
              className={styles.sectionBadge}
              onClick={() => setSelectedDate(null)}
            >
              查看全部
            </Text>
          )}
        </View>

        {displayList.length > 0 ? (
          <View className={styles.timeline}>
            {displayList.map((p, idx) => {
              const daysDiff = dayjs(p.dueDate).diff(dayjs(), 'day');
              const isUrgent = daysDiff <= 7 && daysDiff >= 0;
              const isOverdue = daysDiff < 0;
              return (
                <View
                  key={`${p.id}-${idx}`}
                  className={styles.timelineItem}
                  onClick={() => Taro.navigateTo({
                    url: `/pages/order-detail/index?id=${p.orderId}`
                  })}
                >
                  <View className={styles.timelineDotWrap}>
                    <View className={styles.timelineDot} />
                    {idx < displayList.length - 1 && <View className={styles.timelineLine} />}
                  </View>
                  <View className={styles.timelineContent}>
                    <View className={styles.timelineDate}>
                      <Text>
                        {dayjs(p.dueDate).format('YYYY-MM-DD')}
                        {daysDiff >= 0 && ` · 还有${daysDiff}天`}
                        {daysDiff < 0 && ` · 已超期${-daysDiff}天`}
                      </Text>
                      {(isUrgent || isOverdue) && (
                        <Text className={styles.urgentBadge}>
                          {isOverdue ? '超期' : '紧急'}
                        </Text>
                      )}
                    </View>
                    <View>
                      <Text className={styles.timelineTitle}>{p.orderTitle}</Text>
                      {p.isDelayed && <Text className={styles.delayTag}>延期{p.delayTimes}次</Text>}
                    </View>
                    <View className={styles.timelineMeta}>
                      <Text className={styles.timelineShop}>{p.shopName}</Text>
                      <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx' }}>
                        {p.reminder && <Text style={{ fontSize: '26rpx' }}>🔔</Text>}
                        <Text className={styles.timelineAmount}>
                          {p.type === 'deposit' ? '订金 ' : '尾款 '}
                          {formatCurrency(p.amount)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            emoji="💰"
            title={selectedDate ? '当日没有待付款' : '暂无待付款项'}
            description={selectedDate ? '该日期没有安排付款' : '所有款项已付清，手办党万岁🎉'}
          />
        )}
      </View>
    </View>
  );
};

export default CalendarPage;
