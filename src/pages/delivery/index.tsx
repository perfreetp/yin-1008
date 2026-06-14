import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import StatusTag from '@/components/StatusTag';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/utils/storage';
import type { PreOrder } from '@/types/order';

type TabType = 'pending' | 'delivered' | 'accepted';

const COVER_MAP: Record<string, string> = {
  'VOCALOID': 'https://picsum.photos/id/1/300/300',
  'Re:从零开始的异世界生活': 'https://picsum.photos/id/106/300/300',
  'Fate/stay night': 'https://picsum.photos/id/119/300/300',
  'DARLING in the FRANXX': 'https://picsum.photos/id/225/300/300',
  '约会大作战': 'https://picsum.photos/id/338/300/300',
  '鬼灭之刃': 'https://picsum.photos/id/1025/300/300',
  '新世纪福音战士': 'https://picsum.photos/id/96/300/300',
  '原神': 'https://picsum.photos/id/160/300/300',
  '青春猪头少年系列': 'https://picsum.photos/id/1005/300/300',
  '我的青春恋爱物语果然有问题': 'https://picsum.photos/id/64/300/300'
};

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'pending', label: '运输中', icon: '🚚' },
  { key: 'delivered', label: '待验收', icon: '📦' },
  { key: 'accepted', label: '已验收', icon: '✅' }
];

const DeliveryPage: React.FC = () => {
  const {
    orders,
    initStore,
    initialized,
    markDelivered,
    markAccepted,
    updateTracking
  } = useOrderStore();

  const [activeTab, setActiveTab] = useState<TabType>('pending');

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  usePullDownRefresh(() => {
    setTimeout(() => Taro.stopPullDownRefresh(), 500);
  });

  const groupedOrders = useMemo(() => {
    return {
      pending: orders.filter(o =>
        o.status === 'shipping' || o.status === 'balance_paid'
      ).sort((a, b) => {
        const da = a.shippedAt ? new Date(a.shippedAt).getTime() : Infinity;
        const db = b.shippedAt ? new Date(b.shippedAt).getTime() : Infinity;
        return da - db;
      }),
      delivered: orders.filter(o => o.status === 'delivered'),
      accepted: orders.filter(o => o.status === 'accepted').sort((a, b) => {
        const da = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0;
        const db = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0;
        return db - da;
      })
    };
  }, [orders]);

  const currentList = groupedOrders[activeTab];

  const getCover = (order: PreOrder) => {
    return order.photos[0]?.url || COVER_MAP[order.series || ''] || 'https://picsum.photos/id/201/300/300';
  };

  const goDetail = (order: PreOrder) => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?id=${order.id}`
    });
  };

  const goInspect = (order: PreOrder) => {
    Taro.navigateTo({
      url: `/pages/inspection/index?id=${order.id}`
    });
  };

  const handleMarkDelivered = (e: React.MouseEvent, order: PreOrder) => {
    e.stopPropagation();
    Taro.showModal({
      title: '确认签收',
      content: `确认"${order.title}"已签收？`,
      success: (res) => {
        if (res.confirm) {
          markDelivered(order.id);
          Taro.showToast({ title: '已签收', icon: 'success' });
        }
      }
    });
  };

  const handleMarkAccepted = (e: React.MouseEvent, order: PreOrder) => {
    e.stopPropagation();
    goInspect(order);
  };

  const handleAddTracking = (e: React.MouseEvent, order: PreOrder) => {
    e.stopPropagation();
    Taro.showModal({
      title: '录入物流信息',
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
          Taro.showToast({ title: '物流已更新', icon: 'success' });
        }
      }
    });
  };

  const renderCard = (order: PreOrder) => {
    const hasIssues = order.issues.length > 0;
    const unresolvedIssues = order.issues.filter(i => !i.resolved).length;
    const cover = getCover(order);

    return (
      <View
        key={order.id}
        className={styles.deliveryCard}
        onClick={() => goDetail(order)}
      >
        <View className={styles.cardTop}>
          <View className={styles.trackingBlock}>
            <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <View className={styles.timelineIcon}>
                {activeTab === 'pending' ? '🚚' : activeTab === 'delivered' ? '📦' : '✅'}
              </View>
              <StatusTag type={order.status} size="sm" />
            </View>
            <Text className={styles.trackingTitle}>物流信息</Text>
            {order.trackingNo ? (
              <View className={styles.trackingInfo}>
                <Text className={styles.trackingNo} selectable>{order.trackingNo}</Text>
                {order.shippingCarrier && (
                  <Text className={styles.carrierTag}>{order.shippingCarrier}</Text>
                )}
              </View>
            ) : (
              <Text
                style={{ fontSize: '26rpx', color: '#8B5CF6' }}
                onClick={(e) => handleAddTracking(e, order)}
              >
                + 录入物流单号
              </Text>
            )}
            <View className={styles.trackingDates}>
              {order.shippedAt && (
                <Text className={styles.trackingDateItem}>发货 {order.shippedAt}</Text>
              )}
              {order.deliveredAt && (
                <Text className={styles.trackingDateItem}>签收 {order.deliveredAt}</Text>
              )}
              {order.acceptedAt && (
                <Text className={styles.trackingDateItem}>验收 {order.acceptedAt}</Text>
              )}
            </View>
          </View>
        </View>

        <View className={styles.productBlock}>
          <Image className={styles.productImg} src={cover} mode="aspectFill" />
          <View className={styles.productInfo}>
            <Text className={styles.productTitle}>{order.title}</Text>
            <View className={styles.productMeta}>
              <Text className={styles.shopTag}>{order.shopName}</Text>
              <Text className={styles.priceText}>{formatCurrency(order.totalPrice)}</Text>
            </View>
            {order.photos.length > 0 && (
              <View className={styles.photosPreview}>
                {order.photos.slice(0, 3).map(photo => (
                  <Image
                    key={photo.id}
                    className={styles.photoItem}
                    src={photo.url}
                    mode="aspectFill"
                  />
                ))}
                {order.photos.length > 3 && (
                  <View className={classnames(styles.photoItem, styles.photoMore)}>
                    <Text>+{order.photos.length - 3}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {hasIssues && (
          <View className={styles.issueBlock}>
            <Text className={styles.issueTitle}>
              验收问题 ({order.issues.length})
              {unresolvedIssues > 0 && ` · ${unresolvedIssues}未解决`}
            </Text>
            <View className={styles.issueList}>
              {order.issues.slice(0, 2).map(issue => (
                <View key={issue.id} className={styles.issueItem}>
                  <Text style={{ marginRight: '8rpx' }}>
                    {issue.type === 'missing' ? '❓' : issue.type === 'damaged' ? '⚠️' : '💬'}
                  </Text>
                  <Text style={{ flex: 1 }}>{issue.description}</Text>
                  <Text
                    className={classnames(
                      styles.issueStatus,
                      issue.resolved ? styles.statusResolved : styles.statusOpen
                    )}
                  >
                    {issue.resolved ? '已解决' : '待处理'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab !== 'accepted' && (
          <View className={styles.actionRow}>
            {activeTab === 'pending' && order.trackingNo && (
              <Button
                className={classnames(styles.actionBtn, styles.btnOutline)}
                onClick={(e) => handleMarkDelivered(e, order)}
              >
                我已签收
              </Button>
            )}
            {activeTab === 'pending' && (
              <Button
                className={classnames(styles.actionBtn, styles.btnSecondary)}
                onClick={(e) => handleAddTracking(e, order)}
              >
                {order.trackingNo ? '更新物流' : '录入单号'}
              </Button>
            )}
            {activeTab === 'delivered' && (
              <>
                <Button
                  className={classnames(styles.actionBtn, styles.btnOutline)}
                  onClick={(e) => {
                    e.stopPropagation();
                    goDetail(order);
                  }}
                >
                  查看详情
                </Button>
                <Button
                  className={classnames(styles.actionBtn, styles.btnSuccess)}
                  onClick={(e) => handleMarkAccepted(e, order)}
                >
                  开箱验收
                </Button>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const tabCounts = {
    pending: groupedOrders.pending.length,
    delivered: groupedOrders.delivered.length,
    accepted: groupedOrders.accepted.length
  };

  const bannerConfig = {
    pending: {
      title: '正在运输中的手办',
      sub: '关注物流状态，记得及时签收',
      icon: '🚚',
      color: 'rgba(99, 102, 241, 0.1)'
    },
    delivered: {
      title: '等待开箱验收',
      sub: '请仔细检查手办完整性，登记问题',
      icon: '📦',
      color: 'rgba(245, 158, 11, 0.1)'
    },
    accepted: {
      title: '已完成验收',
      sub: '可将已验收手办转入收藏列表',
      icon: '✅',
      color: 'rgba(16, 185, 129, 0.1)'
    }
  };
  const banner = bannerConfig[activeTab];

  return (
    <View className={styles.page}>
      <View className={styles.tabs}>
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={classnames(
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabText}>
              {tab.icon} {tab.label}
              {tabCounts[tab.key] > 0 && `(${tabCounts[tab.key]})`}
            </Text>
            {activeTab === tab.key && <View className={styles.tabIndicator} />}
          </View>
        ))}
      </View>

      <View className={styles.listContent}>
        <View className={styles.statusBanner} style={{ background: banner.color }}>
          <View className={styles.bannerInfo}>
            <Text className={styles.bannerTitle}>{banner.title}</Text>
            <Text className={styles.bannerSub}>{banner.sub}</Text>
          </View>
          <View className={styles.bannerCount}>
            <Text className={styles.bannerCountText}>{tabCounts[activeTab]}</Text>
          </View>
        </View>

        {currentList.length > 0 ? (
          currentList.map(order => renderCard(order))
        ) : (
          <EmptyState
            emoji={activeTab === 'pending' ? '🚚' : activeTab === 'delivered' ? '📦' : '🎉'}
            title={
              activeTab === 'pending' ? '暂无运输中订单' :
              activeTab === 'delivered' ? '暂无待验收订单' :
              '暂无已验收订单'
            }
            description={
              activeTab === 'pending' ? '所有手办都已安全抵达~' :
              activeTab === 'delivered' ? '签收后记得及时验收哦' :
              '验收通过的手办会在这里展示'
            }
          />
        )}
      </View>
    </View>
  );
};

export default DeliveryPage;
