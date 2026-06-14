import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import styles from './index.module.scss';

interface EmptyStateProps {
  title?: string;
  description?: string;
  emoji?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description = '数据为空，快去添加一些吧',
  emoji = '📦',
  buttonText,
  onButtonClick
}) => {
  return (
    <View className={styles.emptyWrap}>
      <View className={styles.emojiBox}>
        <Text className={styles.emoji}>{emoji}</Text>
      </View>
      <Text className={styles.title}>{title}</Text>
      <Text className={styles.description}>{description}</Text>
      {buttonText && (
        <Button className={styles.actionBtn} onClick={onButtonClick}>
          {buttonText}
        </Button>
      )}
    </View>
  );
};

export default EmptyState;
