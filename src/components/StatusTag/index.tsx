import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { OrderStatus, PaymentStatus } from '@/types/order';

interface StatusTagProps {
  type: OrderStatus | PaymentStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<OrderStatus | PaymentStatus, { label: string; className: string }> = {
  deposit_paid: { label: '已付订金', className: styles.tagInfo },
  waiting_balance: { label: '待补尾款', className: styles.tagWarning },
  balance_paid: { label: '已付清', className: styles.tagSuccess },
  shipping: { label: '运输中', className: styles.tagInfo },
  delivered: { label: '已签收', className: styles.tagWarning },
  accepted: { label: '已验收', className: styles.tagSuccess },
  delayed: { label: '已延期', className: styles.tagError },
  cancelled: { label: '已取消', className: styles.tagTertiary },
  unpaid: { label: '未支付', className: styles.tagError },
  partial: { label: '部分支付', className: styles.tagWarning },
  paid: { label: '已支付', className: styles.tagSuccess }
};

const StatusTag: React.FC<StatusTagProps> = ({ type, size = 'md' }) => {
  const config = statusConfig[type] || { label: type, className: styles.tagTertiary };

  return (
    <View className={classnames(styles.statusTag, config.className, size === 'sm' && styles.tagSm)}>
      <Text className={styles.tagText}>{config.label}</Text>
    </View>
  );
};

export default StatusTag;
