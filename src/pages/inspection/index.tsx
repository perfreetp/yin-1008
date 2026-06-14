import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, Button, Textarea, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import { formatCurrency, generateId } from '@/utils/storage';
import type { InspectionIssue, PhotoItem } from '@/types/order';

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

const CHECKLIST = [
  { key: 'package', label: '外包装完好', desc: '无破损、无浸水、无严重挤压痕迹' },
  { key: 'contents', label: '内物齐全', desc: '手办本体、配件、底座、特典全部齐全' },
  { key: 'condition', label: '品相完好', desc: '无掉漆、无划痕、无性属性瑕疵' },
  { key: 'joint', label: '关节完好', desc: '可动部位无断裂，接合紧密无松动' },
  { key: 'paint', label: '涂装质量', desc: '颜色均匀、无溢色、无明显颗粒' }
];

const ISSUE_TYPES: Array<'missing' | 'damaged' | 'other'> = ['missing', 'damaged', 'other'];
const ISSUE_LABELS: Record<string, string> = {
  missing: '缺件',
  damaged: '破损',
  other: '其他问题'
};

const InspectionPage: React.FC = () => {
  const router = useRouter();
  const {
    orders,
    initStore,
    initialized,
    updateOrder,
    markAccepted
  } = useOrderStore();

  const orderId = router.params?.id || '';
  const order = orders.find(o => o.id === orderId);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [localIssues, setLocalIssues] = useState<InspectionIssue[]>([]);
  const [localPhotos, setLocalPhotos] = useState<PhotoItem[]>([]);

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  useEffect(() => {
    if (order) {
      setLocalIssues(order.issues);
      setLocalPhotos(order.photos);
      setNotes(order.acceptedAt ? (order.internalNotes || '') : '');
    }
  }, [order]);

  const cover = order ? (
    order.photos[0]?.url ||
    COVER_MAP[order.series || ''] ||
    'https://picsum.photos/id/201/400/400'
  ) : '';

  const allChecked = useMemo(() => {
    return CHECKLIST.every(c => checks[c.key]);
  }, [checks]);

  const resolvedCount = localIssues.filter(i => i.resolved).length;

  const toggleCheck = (key: string) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddPhoto = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 9 - localPhotos.length,
        sizeType: ['compressed']
      });
      const newPhotos: PhotoItem[] = (res.tempFilePaths || []).map(url => ({
        id: generateId(),
        url,
        type: 'unboxing',
        uploadAt: new Date().toISOString()
      }));
      const updated = [...localPhotos, ...newPhotos];
      setLocalPhotos(updated);
      if (order) {
        updateOrder(order.id, { photos: updated });
      }
    } catch (err) {
      console.error('[Inspection] add photo failed:', err);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    const updated = localPhotos.filter(p => p.id !== photoId);
    setLocalPhotos(updated);
    if (order) {
      updateOrder(order.id, { photos: updated });
    }
  };

  const handleAddIssue = () => {
    Taro.showActionSheet({
      itemList: ISSUE_TYPES.map(t => ISSUE_LABELS[t]),
      success: (actionRes) => {
        const type = ISSUE_TYPES[actionRes.tapIndex];
        Taro.showModal({
          title: `登记${ISSUE_LABELS[type]}`,
          editable: true,
          placeholderText: '请详细描述问题，以便与客服沟通',
          success: (modalRes) => {
            if (modalRes.confirm && modalRes.content?.trim()) {
              const newIssue: InspectionIssue = {
                id: generateId(),
                type,
                description: modalRes.content.trim(),
                resolved: false,
                createdAt: new Date().toISOString()
              };
              const updated = [...localIssues, newIssue];
              setLocalIssues(updated);
              if (order) {
                updateOrder(order.id, { issues: updated });
              }
              Taro.showToast({ title: '问题已登记', icon: 'success' });
            }
          }
        });
      }
    });
  };

  const handleResolveIssue = (issueId: string) => {
    const updated = localIssues.map(i =>
      i.id === issueId ? { ...i, resolved: true } : i
    );
    setLocalIssues(updated);
    if (order) {
      updateOrder(order.id, { issues: updated });
    }
    Taro.showToast({ title: '已标记解决', icon: 'success' });
  };

  const handleComplete = () => {
    if (!order) return;
    const hasOpenIssue = localIssues.some(i => !i.resolved);
    if (hasOpenIssue) {
      Taro.showModal({
        title: '还有未解决的问题',
        content: `存在 ${localIssues.filter(i => !i.resolved).length} 个未解决问题，建议先联系店铺处理。是否仍要完成验收？`,
        confirmText: '仍要完成',
        cancelText: '返回处理',
        success: (res) => {
          if (res.confirm) {
            doComplete();
          }
        }
      });
      return;
    }

    if (!allChecked) {
      Taro.showModal({
        title: '验收项目未全部确认',
        content: '还有验收项未确认，是否仍要完成验收？',
        success: (res) => {
          if (res.confirm) doComplete();
        }
      });
      return;
    }

    doComplete();
  };

  const doComplete = () => {
    if (!order) return;
    const patch: any = {};
    if (!order.deliveredAt) {
      patch.deliveredAt = new Date().toISOString().split('T')[0];
    }
    patch.acceptedAt = new Date().toISOString().split('T')[0];
    if (notes.trim()) {
      patch.internalNotes = order.internalNotes
        ? `${order.internalNotes}\n\n【验收备注】\n${notes}`
        : `【验收备注】\n${notes}`;
    }
    updateOrder(order.id, patch);
    Taro.showToast({ title: '已完成验收🎉', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 800);
  };

  const handleSaveDraft = () => {
    if (!order) return;
    updateOrder(order.id, {
      issues: localIssues,
      photos: localPhotos,
      internalNotes: notes
    });
    Taro.showToast({ title: '已保存草稿', icon: 'success' });
  };

  if (!order) {
    return (
      <View className={styles.emptyState}>
        <Text className={styles.emptyIcon}>📦</Text>
        <Text className={styles.emptyText}>订单不存在</Text>
      </View>
    );
  }

  const isAccepted = !!order.acceptedAt;

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.orderSummary}>
        <Image className={styles.summaryImg} src={cover} mode="aspectFill" />
        <View className={styles.summaryInfo}>
          <Text className={styles.summaryTitle}>{order.title}</Text>
          <Text className={styles.summaryShop}>{order.shopName}</Text>
          <Text className={styles.summaryPrice}>{formatCurrency(order.totalPrice)}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📷 开箱照片</Text>
          <View className={styles.sectionBadge}>
            {localPhotos.length}/9
          </View>
        </View>
        <View className={styles.photoSection}>
          <View className={styles.photoGrid}>
            {localPhotos.map(photo => (
              <View key={photo.id} className={styles.photoItem}>
                <Image
                  className={styles.photoImg}
                  src={photo.url}
                  mode="aspectFill"
                  onClick={() => Taro.previewImage({
                    urls: localPhotos.map(p => p.url),
                    current: photo.url
                  })}
                />
                {!isAccepted && (
                  <View
                    className={styles.photoDelete}
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    ×
                  </View>
                )}
              </View>
            ))}
            {!isAccepted && localPhotos.length < 9 && (
              <View
                className={classnames(styles.photoItem, styles.photoAdd)}
                onClick={handleAddPhoto}
              >
                <Text className={styles.photoAddIcon}>+</Text>
                <Text className={styles.photoAddText}>添加照片</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>✅ 验收清单</Text>
          <View className={styles.sectionBadge}>
            {Object.values(checks).filter(Boolean).length}/{CHECKLIST.length}
          </View>
        </View>
        <View className={styles.checklistSection}>
          {CHECKLIST.map(item => (
            <View key={item.key} className={styles.checkItem}>
              <View
                className={classnames(
                  styles.checkbox,
                  checks[item.key] && styles.checkboxChecked
                )}
                onClick={() => !isAccepted && toggleCheck(item.key)}
              >
                {checks[item.key] && <Text className={styles.checkMark}>✓</Text>}
              </View>
              <View className={styles.checkInfo}>
                <Text className={classnames(
                  styles.checkLabel,
                  checks[item.key] && styles.checkLabelDone
                )}>
                  {item.label}
                </Text>
                <Text className={styles.checkDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>⚠️ 问题登记</Text>
          {localIssues.length > 0 && (
            <View className={styles.sectionBadge}
              style={{
                background: resolvedCount === localIssues.length ? '#D1FAE5' : '#FEE2E2',
                color: resolvedCount === localIssues.length ? '#10B981' : '#EF4444'
              }}
            >
              {resolvedCount}/{localIssues.length}已解决
            </View>
          )}
        </View>
        <View className={styles.issuesSection}>
          {localIssues.length > 0 ? (
            <>
              {localIssues.map(issue => (
                <View key={issue.id} className={styles.issueItem}>
                  <View className={styles.issueHeader}>
                    <View className={styles.issueType}>
                      {issue.type === 'missing' && '❓'}
                      {issue.type === 'damaged' && '⚠️'}
                      {issue.type === 'other' && '💬'}
                      {ISSUE_LABELS[issue.type]}
                    </View>
                    <Text className={issue.resolved ? styles.issueResolved : styles.issueOpen}>
                      {issue.resolved ? '已解决' : '待处理'}
                    </Text>
                  </View>
                  <Text className={styles.issueDesc}>{issue.description}</Text>
                  <View className={styles.issueFooter}>
                    <Text className={styles.issueTime}>
                      登记于 {issue.createdAt.slice(0, 10)}
                    </Text>
                    {!issue.resolved && !isAccepted && (
                      <View className={styles.issueActions}>
                        <Button
                          className={classnames(styles.issueActionBtn, styles.btnResolve)}
                          onClick={() => handleResolveIssue(issue.id)}
                        >
                          标记解决
                        </Button>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View className={styles.emptyState} style={{ padding: '48rpx 24rpx' }}>
              <Text className={styles.emptyIcon}>✨</Text>
              <Text className={styles.emptyText}>暂无问题登记</Text>
            </View>
          )}
          {!isAccepted && (
            <Button className={styles.btnAddIssue} onClick={handleAddIssue}>
              + 登记问题（缺件/破损等）
            </Button>
          )}
        </View>
      </View>

      {!isAccepted && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>📝 验收备注</Text>
          </View>
          <View className={styles.notesSection}>
            <Textarea
              className={styles.notesTextarea}
              placeholder="记录验收过程中的其他注意事项..."
              value={notes}
              onInput={(e) => setNotes(e.detail.value)}
              maxlength={500}
            />
          </View>
        </View>
      )}

      <View className={styles.bottomBar}>
        {!isAccepted ? (
          <>
            <Button
              className={classnames(styles.btn, styles.btnOutline)}
              onClick={handleSaveDraft}
            >
              保存草稿
            </Button>
            <Button
              className={classnames(styles.btn, styles.btnSuccess)}
              onClick={handleComplete}
            >
              完成验收
            </Button>
          </>
        ) : (
          <Button
            className={classnames(styles.btn, styles.btnPrimary)}
            onClick={() => Taro.navigateBack()}
          >
            返回订单详情
          </Button>
        )}
      </View>
    </ScrollView>
  );
};

export default InspectionPage;
