import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatsCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

const variantMap = {
  primary: styles.variantPrimary,
  success: styles.variantSuccess,
  warning: styles.variantWarning,
  error: styles.variantError,
  info: styles.variantInfo
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subValue,
  icon,
  variant = 'primary',
  onClick
}) => {
  return (
    <View
      className={classnames(styles.statsCard, variantMap[variant], onClick && styles.clickable)}
      onClick={onClick}
    >
      <View className={styles.cardHeader}>
        <Text className={styles.title}>{title}</Text>
        {icon && <Text className={styles.icon}>{icon}</Text>}
      </View>
      <View className={styles.cardBody}>
        <Text className={styles.value}>{value}</Text>
        {subValue && <Text className={styles.subValue}>{subValue}</Text>}
      </View>
    </View>
  );
};

export default StatsCard;
