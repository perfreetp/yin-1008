import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Image, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import EmptyState from '@/components/EmptyState';
import { formatCurrency, formatMonth } from '@/utils/storage';
import dayjs from 'dayjs';
import type { PreOrder } from '@/types/order';

const SERIES_ICONS: Record<string, { emoji: string; bg: string }> = {
  'VOCALOID': { emoji: '🎤', bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  'Re:从零开始的异世界生活': { emoji: '💙', bg: 'linear-gradient(135deg, #60A5FA, #3B82F6)' },
  'Fate/stay night': { emoji: '⚔️', bg: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  'DARLING in the FRANXX': { emoji: '❤️', bg: 'linear-gradient(135deg, #F87171, #EF4444)' },
  '约会大作战': { emoji: '⏰', bg: 'linear-gradient(135deg, #A78BFA, #8B5CF6)' },
  '鬼灭之刃': { emoji: '🔥', bg: 'linear-gradient(135deg, #FB923C, #EA580C)' },
  '新世纪福音战士': { emoji: '🤖', bg: 'linear-gradient(135deg, #A78BFA, #7C3AED)' },
  '原神': { emoji: '✨', bg: 'linear-gradient(135deg, #67E8F9, #06B6D4)' },
  '青春猪头少年系列': { emoji: '🌸', bg: 'linear-gradient(135deg, #FDA4AF, #FB7185)' },
  '我的青春恋爱物语果然有问题': { emoji: '🎀', bg: 'linear-gradient(135deg, #C4B5FD, #A78BFA)' }
};

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

const StatsPage: React.FC = () => {
  const { orders, initStore, initialized, monthlyBudgets, setMonthlyBudget, confirmCollection, removeFromCollection, abandonCollection, restoreToCabinet, deferPayment, togglePaymentReminder, disablePaymentReminder, getBudgetDecisionList } = useOrderStore();
  const [cabinetTab, setCabinetTab] = useState<'collected' | 'pending' | 'removed'>('collected');
  const [expandedDecisionMonth, setExpandedDecisionMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  usePullDownRefresh(() => {
    setTimeout(() => Taro.stopPullDownRefresh(), 500);
  });

  const overview = useMemo(() => {
    const totalBudget = orders.reduce((s, o) => s + o.totalPrice, 0);
    const totalPaid = orders.reduce((s, o) => {
      return s + o.payments.filter(p => p.status === 'paid').reduce((ps, p) => ps + p.amount, 0);
    }, 0);
    const totalPending = totalBudget - totalPaid;
    const collectedCount = orders.filter(o => o.cabinetStatus === 'collected').length;
    const pendingCabinetCount = orders.filter(o => o.cabinetStatus === 'pending_cabinet').length;
    const removedCount = orders.filter(o => o.cabinetStatus === 'removed').length;
    const totalDelayed = orders.filter(o => o.isDelayed).length;
    return { totalBudget, totalPaid, totalPending, collectedCount, pendingCabinetCount, removedCount, totalDelayed };
  }, [orders]);

  const monthStats = useMemo(() => {
    const now = dayjs();
    const months: { month: string; label: string; total: number; paid: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month').format('YYYY-MM');
      const label = now.subtract(i, 'month').format('MM月');
      const monthOrders = orders.filter(o => {
        const orderMonth = dayjs(o.orderDate).format('YYYY-MM');
        return orderMonth === m ||
          (o.actualMonth || o.expectedMonth) === m;
      });
      const total = monthOrders.reduce((s, o) => s + o.totalPrice, 0);
      const paid = monthOrders.reduce((s, o) => {
        const totalPaidInOrder = o.payments
          .filter(p => p.status === 'paid' && p.paidAt?.startsWith(m))
          .reduce((ps, p) => ps + p.amount, 0);
        return s + totalPaidInOrder;
      }, 0);
      months.push({ month: m, label, total, paid });
    }
    const maxVal = Math.max(...months.map(m => Math.max(m.total, m.paid)), 1);
    return { months, maxVal };
  }, [orders]);

  const seriesStats = useMemo(() => {
    const map: Record<string, { orders: PreOrder[]; total: number; paid: number }> = {};
    orders.forEach(o => {
      const series = o.series || '其他系列';
      if (!map[series]) map[series] = { orders: [], total: 0, paid: 0 };
      map[series].orders.push(o);
      map[series].total += o.totalPrice;
      const paid = o.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      map[series].paid += paid;
    });
    return Object.entries(map)
      .map(([series, data]) => ({
        series,
        ...data,
        count: data.orders.length
      }))
      .sort((a, b) => b.total - a.total);
  }, [orders]);

  const acceptedOrders = useMemo(() => {
    return orders.filter(o => o.cabinetStatus === 'collected').sort((a, b) => {
      const da = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0;
      const db = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0;
      return db - da;
    });
  }, [orders]);

  const pendingCabinetOrders = useMemo(() => {
    return orders.filter(o => o.cabinetStatus === 'pending_cabinet').sort((a, b) => {
      const da = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0;
      const db = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0;
      return db - da;
    });
  }, [orders]);

  const removedOrders = useMemo(() => {
    return orders.filter(o => o.cabinetStatus === 'removed').sort((a, b) => {
      const da = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0;
      const db = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0;
      return db - da;
    });
  }, [orders]);

  const budgetWarning = useMemo(() => {
    const now = dayjs();
    const months: {
      month: string;
      label: string;
      pending: number;
      orders: { id: string; title: string; amount: number; dueDate: string; daysDiff: number }[];
    }[] = [];
    for (let i = 0; i < 6; i++) {
      const m = now.add(i, 'month').format('YYYY-MM');
      const label = now.add(i, 'month').format('YYYY年M月');
      const monthOrders: { id: string; title: string; amount: number; dueDate: string; daysDiff: number }[] = [];
      let pending = 0;
      orders.forEach(o => {
        o.payments.forEach(p => {
          if (p.status === 'unpaid' && p.dueDate?.startsWith(m)) {
            pending += p.amount;
            monthOrders.push({
              id: o.id,
              title: o.title,
              amount: p.amount,
              dueDate: p.dueDate,
              daysDiff: dayjs(p.dueDate).diff(now, 'day')
            });
          }
        });
      });
      monthOrders.sort((a, b) => a.daysDiff - b.daysDiff);
      months.push({ month: m, label, pending, orders: monthOrders });
    }
    const maxPending = Math.max(...months.map(m => m.pending), 1);
    return { months, maxPending };
  }, [orders]);

  const progressPercent = overview.totalBudget > 0
    ? Math.round((overview.totalPaid / overview.totalBudget) * 100)
    : 0;

  return (
    <View className={styles.page}>
      <View className={styles.heroSection}>
        <Text className={styles.heroTitle}>预算统计</Text>
        <Text className={styles.heroSubtitle}>
          管理你的手办收藏开支，理性消费
        </Text>

        <View className={styles.totalCard}>
          <View className={styles.totalLabelRow}>
            <Text className={styles.totalLabel}>手办总投入</Text>
            <Text className={styles.totalTag}>已付 {progressPercent}%</Text>
          </View>
          <Text className={styles.totalAmount}>¥{overview.totalBudget.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</Text>
          <View style={{
            height: '12rpx',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '999rpx',
            overflow: 'hidden',
            marginBottom: '32rpx'
          }}>
            <View style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #FCD34D, #F59E0B)',
              borderRadius: '999rpx',
              transition: 'width 0.5s'
            }} />
          </View>
          <View className={styles.totalBreakdown} style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            <View className={styles.breakdownItem}>
              <Text className={styles.breakdownLabel}>待入柜</Text>
              <Text className={styles.breakdownValue}>
                {overview.pendingCabinetCount}件
              </Text>
            </View>
            <View className={styles.breakdownItem}>
              <Text className={styles.breakdownLabel}>已收藏</Text>
              <Text className={classnames(styles.breakdownValue, styles.breakdownGold)}>
                {overview.collectedCount}件
              </Text>
            </View>
            <View className={styles.breakdownItem}>
              <Text className={styles.breakdownLabel}>已出柜</Text>
              <Text className={styles.breakdownValue}>
                {overview.removedCount}件
              </Text>
            </View>
            <View className={styles.breakdownItem}>
              <Text className={styles.breakdownLabel}>延期</Text>
              <Text className={styles.breakdownValue}>
                {overview.totalDelayed}件
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📊 月度开支</Text>
        </View>
        <View className={styles.monthChart}>
          <Text className={styles.monthChartHeader}>
            近6个月预算与实际支出（单位：元）
          </Text>
          {monthStats.months.map((m, idx) => {
            const totalPercent = (m.total / monthStats.maxVal) * 100;
            const paidPercent = (m.paid / monthStats.maxVal) * 100;
            return (
              <View key={m.month} style={{ marginBottom: idx === monthStats.months.length - 1 ? 0 : undefined }}>
                <View className={styles.barRow}>
                  <Text className={styles.barLabel}>{m.label}</Text>
                  <View className={styles.barTrack}>
                    <View className={styles.barFill} style={{ width: `${totalPercent}%` }} />
                  </View>
                  <Text className={styles.barValue}>¥{m.total.toFixed(0)}</Text>
                </View>
                <View className={styles.barRow} style={{ marginBottom: idx < monthStats.months.length - 1 ? '32rpx' : 0, opacity: 0.8 }}>
                  <Text className={styles.barLabel} style={{ color: 'transparent' }}>·</Text>
                  <View className={styles.barTrack} style={{ height: '20rpx' }}>
                    <View
                      className={classnames(styles.barFill, styles.barPaidFill)}
                      style={{ width: `${paidPercent}%` }}
                    />
                  </View>
                  <Text className={styles.barValue} style={{ fontSize: '24rpx', color: '#10B981' }}>
                    实付 ¥{m.paid.toFixed(0)}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32rpx',
            marginTop: '32rpx',
            paddingTop: '24rpx',
            borderTop: '1rpx solid #F2F3F5'
          }}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx' }}>
              <View style={{
                width: '24rpx', height: '16rpx',
                background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                borderRadius: '4rpx'
              }} />
              <Text style={{ fontSize: '22rpx', color: '#4B5563' }}>月度预算</Text>
            </View>
            <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx' }}>
              <View style={{
                width: '24rpx', height: '16rpx',
                background: 'linear-gradient(90deg, #10B981, #34D399)',
                borderRadius: '4rpx'
              }} />
              <Text style={{ fontSize: '22rpx', color: '#4B5563' }}>实际支付</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>⚠️ 月度预算预警</Text>
        </View>
        <View style={{
          background: '#FFFFFF',
          borderRadius: '16rpx',
          boxShadow: '0 2rpx 12rpx rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {budgetWarning.months.filter(m => m.pending > 0).length > 0 ? (
            budgetWarning.months.filter(m => m.pending > 0).map((m, mIdx) => {
              const isHighest = m.pending === budgetWarning.maxPending;
              const budgetLimit = monthlyBudgets.find(b => b.month === m.month)?.limit || 0;
              const isOverBudget = budgetLimit > 0 && m.pending > budgetLimit;
              const isNearBudget = budgetLimit > 0 && m.pending >= budgetLimit * 0.8 && m.pending < budgetLimit;
              const overAmount = isOverBudget ? m.pending - budgetLimit : 0;
              const barPercent = budgetLimit > 0
                ? Math.min((m.pending / budgetLimit) * 100, 150)
                : (m.pending / budgetWarning.maxPending) * 100;
              const decisionList = getBudgetDecisionList(m.month);
              const highCount = decisionList.filter(d => d.riskLevel === 'high').length;
              const mediumCount = decisionList.filter(d => d.riskLevel === 'medium').length;
              const lowCount = decisionList.filter(d => d.riskLevel === 'low').length;
              const showDecision = m.pending > 0 && budgetLimit > 0;
              const isDecisionExpanded = expandedDecisionMonth === m.month;
              return (
                <View
                  key={m.month}
                  style={{
                    padding: '24rpx 32rpx',
                    borderBottom: mIdx < budgetWarning.months.filter(m2 => m2.pending > 0).length - 1 ? '1rpx solid #F2F3F5' : 'none'
                  }}
                >
                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16rpx' }}>
                    <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx', flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: '28rpx', fontWeight: 600, color: isOverBudget ? '#EF4444' : isNearBudget ? '#F59E0B' : isHighest ? '#EF4444' : '#1E1B4B' }}>
                        {m.label}
                      </Text>
                      {isOverBudget && (
                        <View style={{
                          background: '#FEE2E2',
                          padding: '4rpx 14rpx',
                          borderRadius: '8rpx',
                          fontSize: '22rpx',
                          color: '#EF4444',
                          fontWeight: 600
                        }}>
                          超预算 ¥{overAmount.toFixed(0)}
                        </View>
                      )}
                      {isNearBudget && (
                        <View style={{
                          background: '#FEF3C7',
                          padding: '4rpx 14rpx',
                          borderRadius: '8rpx',
                          fontSize: '22rpx',
                          color: '#D97706',
                          fontWeight: 600
                        }}>
                          即将超支
                        </View>
                      )}
                      {!isOverBudget && !isNearBudget && isHighest && (
                        <View style={{
                          background: '#FEE2E2',
                          padding: '4rpx 14rpx',
                          borderRadius: '8rpx',
                          fontSize: '22rpx',
                          color: '#EF4444',
                          fontWeight: 600
                        }}>
                          最高
                        </View>
                      )}
                    </View>
                    <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                      <Text style={{
                        fontSize: '32rpx',
                        fontWeight: 700,
                        color: isOverBudget ? '#EF4444' : isNearBudget ? '#F59E0B' : '#F59E0B'
                      }}>
                        ¥{m.pending.toFixed(0)}
                      </Text>
                      <Text
                        style={{ fontSize: '22rpx', color: '#8B5CF6', fontWeight: 600, padding: '4rpx 12rpx', background: 'rgba(139,92,246,0.1)', borderRadius: '8rpx' }}
                        onClick={() => {
                          Taro.showModal({
                            title: `设置${m.label}预算上限`,
                            editable: true,
                            placeholderText: '请输入月度预算金额',
                            content: budgetLimit > 0 ? String(budgetLimit) : '',
                            success: (res) => {
                              if (res.confirm && res.content?.trim()) {
                                const val = parseFloat(res.content.trim());
                                if (!isNaN(val) && val > 0) {
                                  setMonthlyBudget(m.month, val);
                                  Taro.showToast({ title: '预算已设置', icon: 'success' });
                                }
                              }
                            }
                          });
                        }}
                      >
                        {budgetLimit > 0 ? `上限¥${budgetLimit.toFixed(0)}` : '设上限'}
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    height: '12rpx',
                    background: '#F2F3F5',
                    borderRadius: '999rpx',
                    overflow: 'hidden',
                    marginBottom: '16rpx',
                    position: 'relative'
                  }}>
                    <View style={{
                      width: `${Math.min(barPercent, 100)}%`,
                      height: '100%',
                      background: isOverBudget
                        ? 'linear-gradient(90deg, #EF4444, #F87171)'
                        : isNearBudget
                          ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                          : isHighest
                            ? 'linear-gradient(90deg, #EF4444, #F87171)'
                            : 'linear-gradient(90deg, #F59E0B, #FCD34D)',
                      borderRadius: '999rpx'
                    }} />
                    {budgetLimit > 0 && (
                      <View style={{
                        position: 'absolute',
                        left: `${Math.min((budgetLimit / (budgetWarning.maxPending || 1)) * 100, 100)}%`,
                        top: '-4rpx',
                        width: '4rpx',
                        height: '20rpx',
                        background: '#EF4444',
                        borderRadius: '2rpx'
                      }} />
                    )}
                  </View>

                  {showDecision && (
                    <View style={{
                      background: isOverBudget ? '#FEF2F2' : '#FFFBEB',
                      borderRadius: '8rpx',
                      padding: '12rpx 16rpx',
                      marginBottom: '12rpx'
                    }}>
                      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: '22rpx', color: isOverBudget ? '#EF4444' : '#D97706', fontWeight: 600 }}>
                          💡 决策建议：高风险 {highCount} 项 · 中风险 {mediumCount} 项 · 低风险 {lowCount} 项
                        </Text>
                        <Text
                          style={{ fontSize: '22rpx', color: '#8B5CF6', fontWeight: 600 }}
                          onClick={() => setExpandedDecisionMonth(isDecisionExpanded ? null : m.month)}
                        >
                          {isDecisionExpanded ? '收起' : '查看决策排序 →'}
                        </Text>
                      </View>
                      {isDecisionExpanded && (
                        <View style={{ marginTop: '16rpx' }}>
                          {decisionList.map((item, idx) => {
                            const reasonTags = item.reason ? item.reason.split('、').filter(Boolean) : [];
                            const riskBarColor = item.riskLevel === 'high'
                              ? 'linear-gradient(90deg, #EF4444, #F87171)'
                              : item.riskLevel === 'medium'
                                ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                                : 'linear-gradient(90deg, #10B981, #34D399)';
                            const riskTextColor = item.riskLevel === 'high'
                              ? '#EF4444'
                              : item.riskLevel === 'medium'
                                ? '#D97706'
                                : '#059669';
                            const isReminderOn = item.payment.reminder;
                            return (
                              <View
                                key={item.payment.id}
                                style={{
                                  background: '#FFFFFF',
                                  borderRadius: '12rpx',
                                  padding: '16rpx',
                                  marginBottom: idx < decisionList.length - 1 ? '12rpx' : 0,
                                  boxShadow: '0 2rpx 8rpx rgba(0,0,0,0.04)'
                                }}
                              >
                                <View style={{ display: 'flex', alignItems: 'center', gap: '10rpx', marginBottom: '12rpx' }}>
                                  <View style={{
                                    padding: '4rpx 12rpx',
                                    borderRadius: '6rpx',
                                    fontSize: '20rpx',
                                    fontWeight: 600,
                                    background: item.riskLevel === 'high' ? '#FEE2E2' : item.riskLevel === 'medium' ? '#FEF3C7' : '#D1FAE5',
                                    color: riskTextColor
                                  }}>
                                    {item.riskLevel === 'high' ? '高风险' : item.riskLevel === 'medium' ? '中风险' : '低风险'}
                                  </View>
                                  <Text
                                    style={{ fontSize: '26rpx', fontWeight: 600, color: '#1E1B4B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    numberOfLines={1}
                                  >
                                    {item.order.title}
                                  </Text>
                                  <Text style={{ fontSize: '26rpx', fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
                                    ¥{item.payment.amount.toFixed(0)}
                                  </Text>
                                </View>

                                <View style={{ marginBottom: '12rpx' }}>
                                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6rpx' }}>
                                    <Text style={{ fontSize: '20rpx', color: '#6B7280', fontWeight: 500 }}>
                                      风险评分
                                    </Text>
                                    <Text style={{ fontSize: '20rpx', fontWeight: 700, color: riskTextColor }}>
                                      {item.riskScore}分
                                    </Text>
                                  </View>
                                  <View style={{
                                    height: '10rpx',
                                    background: '#F2F3F5',
                                    borderRadius: '999rpx',
                                    overflow: 'hidden'
                                  }}>
                                    <View style={{
                                      width: `${item.riskScore}%`,
                                      height: '100%',
                                      background: riskBarColor,
                                      borderRadius: '999rpx',
                                      transition: 'width 0.3s'
                                    }} />
                                  </View>
                                </View>

                                {reasonTags.length > 0 && (
                                  <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginBottom: '14rpx' }}>
                                    {reasonTags.map((tag, tagIdx) => (
                                      <View
                                        key={tagIdx}
                                        style={{
                                          padding: '4rpx 12rpx',
                                          borderRadius: '999rpx',
                                          fontSize: '20rpx',
                                          background: '#F3F4F6',
                                          color: '#4B5563',
                                          fontWeight: 500
                                        }}
                                      >
                                        {tag}
                                      </View>
                                    ))}
                                  </View>
                                )}

                                <View style={{ display: 'flex', gap: '10rpx', marginBottom: '12rpx' }}>
                                  <Text
                                    style={{
                                      flex: 1,
                                      textAlign: 'center',
                                      padding: '10rpx 0',
                                      fontSize: '24rpx',
                                      fontWeight: 600,
                                      color: '#FFFFFF',
                                      background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                                      borderRadius: '8rpx',
                                      boxShadow: '0 2rpx 8rpx rgba(139,92,246,0.3)'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      Taro.showModal({
                                        title: '延期付款',
                                        editable: true,
                                        placeholderText: '请输入新的到期日期（YYYY-MM-DD）',
                                        content: item.payment.dueDate || '',
                                        success: (res) => {
                                          if (res.confirm && res.content?.trim()) {
                                            const newDate = res.content.trim();
                                            deferPayment(item.order.id, item.payment.id, '延期付款', newDate);
                                            Taro.showToast({ title: '已延期', icon: 'success' });
                                          }
                                        }
                                      });
                                    }}
                                  >
                                    延期
                                  </Text>
                                  <Text
                                    style={{
                                      flex: 1,
                                      textAlign: 'center',
                                      padding: '10rpx 0',
                                      fontSize: '24rpx',
                                      fontWeight: 600,
                                      color: isReminderOn ? '#4B5563' : '#9CA3AF',
                                      background: isReminderOn ? '#F3F4F6' : '#F9FAFB',
                                      borderRadius: '8rpx',
                                      opacity: isReminderOn ? 1 : 0.6
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isReminderOn) {
                                        Taro.showToast({ title: '提醒已关闭', icon: 'none' });
                                        return;
                                      }
                                      disablePaymentReminder(item.order.id, item.payment.id);
                                      Taro.showToast({ title: '已关闭提醒', icon: 'none' });
                                    }}
                                  >
                                    关提醒
                                  </Text>
                                  <Text
                                    style={{
                                      flex: 1,
                                      textAlign: 'center',
                                      padding: '10rpx 0',
                                      fontSize: '24rpx',
                                      fontWeight: 600,
                                      color: '#92400E',
                                      background: 'linear-gradient(135deg, #FCD34D, #FBBF24)',
                                      borderRadius: '8rpx',
                                      boxShadow: '0 2rpx 8rpx rgba(245,158,11,0.3)'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      Taro.showModal({
                                        title: '暂缓付款',
                                        editable: true,
                                        placeholderText: '请输入暂缓原因',
                                        success: (res) => {
                                          if (res.confirm && res.content?.trim()) {
                                            const reason = res.content.trim();
                                            deferPayment(item.order.id, item.payment.id, reason);
                                            Taro.showToast({ title: '已暂缓', icon: 'success' });
                                          }
                                        }
                                      });
                                    }}
                                  >
                                    暂缓
                                  </Text>
                                </View>

                                <View style={{
                                  display: 'flex',
                                  justifyContent: 'center',
                                  paddingTop: '10rpx',
                                  borderTop: '1rpx solid #F2F3F5'
                                }}>
                                  <Text
                                    style={{
                                      fontSize: '22rpx',
                                      color: '#8B5CF6',
                                      fontWeight: 500
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      Taro.navigateTo({
                                        url: `/pages/order-detail/index?id=${item.order.id}`
                                      });
                                    }}
                                  >
                                    跳转到订单 →
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  {m.orders.map((o, oIdx) => {
                    const isPriorityCut = isOverBudget && oIdx >= m.orders.length - Math.ceil(overAmount / (m.pending / m.orders.length));
                    return (
                      <View
                        key={`${o.id}-${oIdx}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8rpx 0',
                          opacity: isPriorityCut ? 1 : 0.9,
                          background: isPriorityCut ? '#FEF2F2' : 'transparent',
                          borderRadius: '8rpx',
                          paddingLeft: isPriorityCut ? '12rpx' : 0,
                          paddingRight: isPriorityCut ? '12rpx' : 0
                        }}
                        onClick={() => Taro.navigateTo({
                          url: `/pages/order-detail/index?id=${o.id}`
                        })}
                      >
                        <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx', flex: 1, minWidth: 0 }}>
                          {isPriorityCut && (
                            <Text style={{ fontSize: '20rpx', color: '#EF4444', flexShrink: 0 }}>⚡</Text>
                          )}
                          <Text style={{ fontSize: '24rpx', color: isPriorityCut ? '#EF4444' : '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {o.title}
                          </Text>
                          {o.daysDiff <= 7 && o.daysDiff >= 0 && (
                            <Text style={{ fontSize: '20rpx', color: '#EF4444', fontWeight: 600, flexShrink: 0 }}>
                              {o.daysDiff}天后
                            </Text>
                          )}
                          {o.daysDiff < 0 && (
                            <Text style={{ fontSize: '20rpx', color: '#EF4444', fontWeight: 600, flexShrink: 0 }}>
                              已超期
                            </Text>
                          )}
                        </View>
                        <Text style={{
                          fontSize: '26rpx',
                          color: isPriorityCut ? '#EF4444' : '#F59E0B',
                          fontWeight: 600,
                          flexShrink: 0,
                          marginLeft: '16rpx'
                        }}>
                          ¥{o.amount.toFixed(0)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })
          ) : (
            <View style={{ padding: '48rpx 32rpx', textAlign: 'center' }}>
              <Text style={{ fontSize: '48rpx' }}>🎉</Text>
              <Text style={{ display: 'block', fontSize: '26rpx', color: '#9CA3AF', marginTop: '12rpx' }}>
                未来6个月无待付款，预算安全！
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🎨 系列预算分布</Text>
        </View>
        {seriesStats.length > 0 ? (
          <View className={styles.seriesList}>
            {seriesStats.map(s => {
              const icon = SERIES_ICONS[s.series] || { emoji: '📦', bg: 'linear-gradient(135deg, #9CA3AF, #6B7280)' };
              const paidPercent = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0;
              return (
                <View key={s.series} className={styles.seriesItem}>
                  <View className={styles.seriesIcon} style={{ background: icon.bg }}>
                    <Text>{icon.emoji}</Text>
                  </View>
                  <View className={styles.seriesInfo}>
                    <Text className={styles.seriesName}>{s.series}</Text>
                    <View className={styles.seriesMeta}>
                      <Text className={styles.seriesCount}>{s.count} 件</Text>
                      <Text>已付 {paidPercent}%</Text>
                    </View>
                    <View style={{
                      marginTop: '12rpx',
                      height: '8rpx',
                      background: '#F2F3F5',
                      borderRadius: '999rpx',
                      overflow: 'hidden'
                    }}>
                      <View style={{
                        width: `${paidPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                        borderRadius: '999rpx'
                      }} />
                    </View>
                  </View>
                  <View className={styles.seriesAmount}>
                    <Text className={styles.seriesTotal}>¥{s.total.toFixed(0)}</Text>
                    <Text className={styles.seriesPaid}>实付 ¥{s.paid.toFixed(0)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            emoji="📊"
            title="暂无统计数据"
            description="开始预订手办后，这里会展示系列预算分析"
          />
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🏆 我的藏品库</Text>
          <View style={{ display: 'flex', gap: '8rpx' }}>
            <Text
              style={{
                fontSize: '22rpx',
                padding: '6rpx 16rpx',
                borderRadius: '999rpx',
                fontWeight: 600,
                background: cabinetTab === 'pending' ? '#8B5CF6' : '#F3F4F6',
                color: cabinetTab === 'pending' ? '#FFFFFF' : '#6B7280'
              }}
              onClick={() => setCabinetTab('pending')}
            >
              待入柜 {pendingCabinetOrders.length}
            </Text>
            <Text
              style={{
                fontSize: '22rpx',
                padding: '6rpx 16rpx',
                borderRadius: '999rpx',
                fontWeight: 600,
                background: cabinetTab === 'collected' ? '#8B5CF6' : '#F3F4F6',
                color: cabinetTab === 'collected' ? '#FFFFFF' : '#6B7280'
              }}
              onClick={() => setCabinetTab('collected')}
            >
              已收藏 {acceptedOrders.length}
            </Text>
            <Text
              style={{
                fontSize: '22rpx',
                padding: '6rpx 16rpx',
                borderRadius: '999rpx',
                fontWeight: 600,
                background: cabinetTab === 'removed' ? '#8B5CF6' : '#F3F4F6',
                color: cabinetTab === 'removed' ? '#FFFFFF' : '#6B7280'
              }}
              onClick={() => setCabinetTab('removed')}
            >
              已出柜 {removedOrders.length}
            </Text>
          </View>
        </View>

        {cabinetTab === 'pending' && (
          pendingCabinetOrders.length > 0 ? (
            <View className={styles.collectionGrid}>
              {pendingCabinetOrders.map(order => {
                const cover = order.photos[0]?.url || COVER_MAP[order.series || ''] || 'https://picsum.photos/id/201/400/400';
                return (
                  <View
                    key={order.id}
                    className={styles.collectionItem}
                    onClick={() => Taro.navigateTo({
                      url: `/pages/order-detail/index?id=${order.id}`
                    })}
                  >
                    <Image className={styles.collectionImg} src={cover} mode="aspectFill" />
                    <View className={styles.collectionInfo}>
                      <Text className={styles.collectionTitle}>{order.title}</Text>
                      <View className={styles.collectionMeta}>
                        <Text className={styles.collectionShop}>{order.shopName}</Text>
                        <Text
                          style={{ fontSize: '22rpx', color: '#8B5CF6', fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmCollection(order.id);
                            Taro.showToast({ title: '已确认收藏', icon: 'success' });
                          }}
                        >
                          确认收藏 ›
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              emoji="📋"
              title="暂无待入柜"
              description="完成验收的手办会在这里等待确认收藏"
            />
          )
        )}

        {cabinetTab === 'collected' && (
          acceptedOrders.length > 0 ? (
            <View className={styles.collectionGrid}>
              {acceptedOrders.map(order => {
                const cover = order.photos[0]?.url || COVER_MAP[order.series || ''] || 'https://picsum.photos/id/201/400/400';
                return (
                  <View
                    key={order.id}
                    className={styles.collectionItem}
                    onClick={() => Taro.navigateTo({
                      url: `/pages/order-detail/index?id=${order.id}`
                    })}
                  >
                    <Image className={styles.collectionImg} src={cover} mode="aspectFill" />
                    <View className={styles.collectionInfo}>
                      <Text className={styles.collectionTitle}>{order.title}</Text>
                      <View className={styles.collectionMeta}>
                        <Text className={styles.collectionShop}>{order.shopName}</Text>
                        <Text className={styles.collectionDate}>
                          {order.acceptedAt ? dayjs(order.acceptedAt).format('M月') : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              emoji="🏆"
              title="收藏夹空空如也"
              description="完成验收并确认收藏的手办会在这里展示"
            />
          )
        )}

        {cabinetTab === 'removed' && (
          removedOrders.length > 0 ? (
            <View className={styles.collectionGrid}>
              {removedOrders.map(order => {
                const cover = order.photos[0]?.url || COVER_MAP[order.series || ''] || 'https://picsum.photos/id/201/400/400';
                return (
                  <View
                    key={order.id}
                    className={styles.collectionItem}
                    style={{ opacity: 0.7 }}
                    onClick={() => Taro.navigateTo({
                      url: `/pages/order-detail/index?id=${order.id}`
                    })}
                  >
                    <View style={{ position: 'relative' }}>
                      <Image className={styles.collectionImg} src={cover} mode="aspectFill" />
                      <View style={{
                        position: 'absolute',
                        top: '12rpx',
                        right: '12rpx',
                        background: 'rgba(239, 68, 68, 0.9)',
                        padding: '4rpx 12rpx',
                        borderRadius: '8rpx',
                        fontSize: '20rpx',
                        color: '#FFFFFF',
                        fontWeight: 600
                      }}>
                        已出柜
                      </View>
                    </View>
                    <View className={styles.collectionInfo}>
                      <Text className={styles.collectionTitle}>{order.title}</Text>
                      <View className={styles.collectionMeta}>
                        <Text className={styles.collectionShop}>{order.shopName}</Text>
                        <Text
                          style={{ fontSize: '22rpx', color: '#8B5CF6', fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreToCabinet(order.id);
                            Taro.showToast({ title: '已恢复', icon: 'success' });
                          }}
                        >
                          恢复 ›
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              emoji="📦"
              title="暂无已出柜"
              description="移出收藏的手办会在这里展示"
            />
          )
        )}
      </View>
    </View>
  );
};

export default StatsPage;
