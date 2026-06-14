import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import StatusTag from '../StatusTag';
import type { PreOrder } from '@/types/order';
import { formatCurrency, formatMonth } from '@/utils/storage';

interface OrderCardProps {
  order: PreOrder;
  variant?: 'default' | 'compact' | 'delivery';
  onClick?: () => void;
}

const coverImages: Record<string, string> = {
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

const OrderCard: React.FC<OrderCardProps> = ({ order, variant = 'default', onClick }) => {
  const cover = order.photos[0]?.url || coverImages[order.series || ''] || 'https://picsum.photos/id/201/300/300';

  const unpaidBalance = order.payments.find(
    p => p.type === 'balance' && p.status === 'unpaid'
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/order-detail/index?id=${order.id}`
      });
    }
  };

  if (variant === 'compact') {
    return (
      <View className={classnames(styles.card, styles.compact)} onClick={handleClick}>
        <Image className={styles.thumbImg} src={cover} mode="aspectFill" />
        <View className={styles.compactContent}>
          <Text className={styles.titleCompact}>{order.title}</Text>
          <View className={styles.metaRow}>
            <Text className={styles.shopName}>{order.shopName}</Text>
            <Text className={styles.priceCompact}>{formatCurrency(order.totalPrice)}</Text>
          </View>
          <View className={styles.tagRow}>
            <StatusTag type={order.status} size="sm" />
            {order.isDelayed && <View className={styles.delayDot}>延期</View>}
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'delivery') {
    return (
      <View className={classnames(styles.card, styles.deliveryCard)} onClick={handleClick}>
        <View className={styles.deliveryHeader}>
          <StatusTag type={order.status} />
          <Text className={styles.deliveryDate}>
            {order.deliveredAt ? `签收 ${order.deliveredAt}` :
             order.shippedAt ? `发货 ${order.shippedAt}` : '待发货'}
          </Text>
        </View>
        <View className={styles.deliveryBody}>
          <Image className={styles.thumbImg} src={cover} mode="aspectFill" />
          <View className={styles.compactContent}>
            <Text className={styles.titleCompact}>{order.title}</Text>
            {order.trackingNo && (
              <View className={styles.trackingRow}>
                <Text className={styles.label}>物流:</Text>
                <Text className={styles.trackingNo}>{order.shippingCarrier} {order.trackingNo}</Text>
              </View>
            )}
            <View className={styles.issuesRow}>
              {order.issues.length > 0 && (
                <View className={styles.issueBadge}>
                  <Text>{order.issues.length}个问题</Text>
                </View>
              )}
              {order.issues.some(i => !i.resolved) && (
                <View className={styles.unresolvedBadge}>未解决</View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.cardHeader}>
        <View className={styles.seriesTag}>
          <Text className={styles.seriesText}>{order.series || '未分类'}</Text>
        </View>
        <StatusTag type={order.status} size="sm" />
      </View>

      <View className={styles.cardBody}>
        <Image className={styles.coverImg} src={cover} mode="aspectFill" />
        <View className={styles.infoWrap}>
          <Text className={styles.title}>{order.title}</Text>
          {order.character && (
            <Text className={styles.character}>角色: {order.character}</Text>
          )}
          <View className={styles.shopRow}>
            <View className={styles.shopTag}>
              <Text>{order.shopName}</Text>
            </View>
            {order.isDelayed && (
              <View className={styles.delayBadge}>
                <Text>延期{order.delayTimes}次</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className={styles.cardFooter}>
        <View className={styles.footerLeft}>
          <Text className={styles.footerLabel}>预计发售</Text>
          <Text className={styles.footerValue}>
            {formatMonth(order.actualMonth || order.expectedMonth)}
          </Text>
        </View>
        <View className={styles.footerRight}>
          <Text className={styles.footerLabel}>总计</Text>
          <Text className={styles.priceValue}>{formatCurrency(order.totalPrice)}</Text>
        </View>
      </View>

      {unpaidBalance && (
        <View className={styles.unpaidBanner}>
          <Text className={styles.unpaidText}>
            待付尾款 {formatCurrency(unpaidBalance.amount)}
            {unpaidBalance.dueDate && ` · ${unpaidBalance.dueDate}`}
          </Text>
          <View className={styles.unpaidDot} />
        </View>
      )}
    </View>
  );
};

export default OrderCard;
