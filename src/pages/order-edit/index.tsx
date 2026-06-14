import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, Textarea, Switch, Button, ScrollView, Picker } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useOrderStore } from '@/store/useOrderStore';
import dayjs from 'dayjs';

interface FormState {
  title: string;
  series: string;
  character: string;
  maker: string;
  scale: string;
  shopId: string;
  shopName: string;
  totalPrice: string;
  deposit: string;
  balance: string;
  expectedMonth: string;
  orderDate: string;
  orderNo: string;
  customerNotes: string;
  internalNotes: string;
  reminder: boolean;
  isFavorite: boolean;
  isDelayed: boolean;
  delayReason: string;
}

const DEFAULT_FORM: FormState = {
  title: '',
  series: '',
  character: '',
  maker: '',
  scale: '',
  shopId: '',
  shopName: '',
  totalPrice: '',
  deposit: '',
  balance: '',
  expectedMonth: dayjs().add(3, 'month').format('YYYY-MM'),
  orderDate: dayjs().format('YYYY-MM-DD'),
  orderNo: '',
  customerNotes: '',
  internalNotes: '',
  reminder: true,
  isFavorite: false,
  isDelayed: false,
  delayReason: ''
};

const SCALE_OPTIONS = ['1/4', '1/6', '1/7', '1/8', '1/12', '其他比例'];

const OrderEditPage: React.FC = () => {
  const router = useRouter();
  const {
    orders,
    shops,
    initStore,
    initialized,
    addOrder,
    updateOrder,
    deleteOrder
  } = useOrderStore();

  const orderId = router.params?.id;
  const isEdit = !!orderId;

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [scalePickerOpen, setScalePickerOpen] = useState(false);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);

  useEffect(() => {
    if (!initialized) initStore();
  }, [initialized, initStore]);

  useDidShow(() => {
    if (!initialized) initStore();
  });

  useEffect(() => {
    if (isEdit && initialized) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const balancePayment = order.payments.find(p => p.type === 'balance');
        setForm({
          title: order.title,
          series: order.series || '',
          character: order.character || '',
          maker: order.maker || '',
          scale: order.scale || '',
          shopId: order.shopId,
          shopName: order.shopName,
          totalPrice: order.totalPrice.toString(),
          deposit: order.deposit.toString(),
          balance: order.balance.toString(),
          expectedMonth: order.actualMonth || order.expectedMonth,
          orderDate: order.orderDate,
          orderNo: order.orderNo || '',
          customerNotes: order.customerNotes || '',
          internalNotes: order.internalNotes || '',
          reminder: balancePayment?.reminder ?? true,
          isFavorite: order.isFavorite,
          isDelayed: order.isDelayed,
          delayReason: order.delayReason || ''
        });
      }
    }
  }, [isEdit, orderId, orders, initialized]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handlePriceChange = (key: 'totalPrice' | 'deposit' | 'balance', val: string) => {
    const numVal = val.replace(/[^\d.]/g, '');
    updateField(key, numVal);
  };

  useEffect(() => {
    const dep = parseFloat(form.deposit) || 0;
    const bal = parseFloat(form.balance) || 0;
    const total = parseFloat(form.totalPrice) || 0;
    if (total === 0 && (dep > 0 || bal > 0)) {
      updateField('totalPrice', (dep + bal).toString());
    } else if (total > 0 && dep > 0 && bal === 0) {
      updateField('balance', Math.max(0, total - dep).toString());
    } else if (total > 0 && bal > 0 && dep === 0) {
      updateField('deposit', Math.max(0, total - bal).toString());
    }
  }, [form.deposit, form.balance, form.totalPrice]);

  const validate = (): string | null => {
    if (!form.title.trim()) return '请输入手办名称';
    if (!form.shopName.trim()) return '请选择或输入店铺';
    if (!form.expectedMonth) return '请选择预计发售月';
    const total = parseFloat(form.totalPrice) || 0;
    if (total <= 0) return '请输入正确的价格';
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      Taro.showToast({ title: err, icon: 'none' });
      return;
    }

    const data = {
      title: form.title.trim(),
      series: form.series.trim() || undefined,
      character: form.character.trim() || undefined,
      maker: form.maker.trim() || undefined,
      scale: form.scale || undefined,
      shopId: form.shopId,
      shopName: form.shopName.trim(),
      totalPrice: parseFloat(form.totalPrice) || 0,
      deposit: parseFloat(form.deposit) || 0,
      balance: parseFloat(form.balance) || 0,
      expectedMonth: form.expectedMonth,
      orderDate: form.orderDate,
      orderNo: form.orderNo.trim() || undefined,
      customerNotes: form.customerNotes.trim() || undefined,
      internalNotes: form.internalNotes.trim() || undefined,
      isFavorite: form.isFavorite
    };

    if (isEdit) {
      const patch: Partial<any> = { ...data };
      if (form.isDelayed) {
        patch.isDelayed = true;
        patch.delayReason = form.delayReason || undefined;
      }
      updateOrder(orderId, patch);
      Taro.showToast({ title: '已保存', icon: 'success' });
    } else {
      addOrder(data);
      Taro.showToast({ title: '已添加', icon: 'success' });
    }

    setTimeout(() => Taro.navigateBack(), 600);
  };

  const handleDelete = () => {
    if (!isEdit) return;
    Taro.showModal({
      title: '删除确认',
      content: '确定要删除这条预订记录吗？此操作不可恢复。',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          deleteOrder(orderId);
          Taro.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 500);
        }
      }
    });
  };

  const shopOptions = shops.map(s => s.name);
  const todayStr = dayjs().format('YYYY-MM-DD');

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.form}>
        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>🎴 手办信息</Text>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>手办名称</Text>
            <View className={styles.formInputWrap}>
              <Input
                className={styles.formInput}
                placeholder="如：初音未来 10周年Ver."
                placeholderClass={styles.formInputPlaceholder}
                value={form.title}
                onInput={(e) => updateField('title', e.detail.value)}
                maxlength={50}
              />
            </View>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>所属系列</Text>
            <View className={styles.formInputWrap}>
              <Input
                className={styles.formInput}
                placeholder="如：VOCALOID、原神"
                placeholderClass={styles.formInputPlaceholder}
                value={form.series}
                onInput={(e) => updateField('series', e.detail.value)}
                maxlength={30}
              />
            </View>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>角色名称</Text>
            <View className={styles.formInputWrap}>
              <Input
                className={styles.formInput}
                placeholder="如：初音未来"
                placeholderClass={styles.formInputPlaceholder}
                value={form.character}
                onInput={(e) => updateField('character', e.detail.value)}
                maxlength={20}
              />
            </View>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>制作厂商</Text>
            <View className={styles.formInputWrap}>
              <Input
                className={styles.formInput}
                placeholder="如：GSC、ALTER"
                placeholderClass={styles.formInputPlaceholder}
                value={form.maker}
                onInput={(e) => updateField('maker', e.detail.value)}
                maxlength={20}
              />
            </View>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>比例</Text>
            <Picker
              mode="selector"
              range={SCALE_OPTIONS}
              value={SCALE_OPTIONS.indexOf(form.scale)}
              onChange={(e) => updateField('scale', SCALE_OPTIONS[e.detail.value])}
            >
              <View className={styles.formInputWrap}>
                <Input
                  className={styles.formInput}
                  placeholder="选择比例"
                  placeholderClass={styles.formInputPlaceholder}
                  value={form.scale}
                  disabled
                />
                <Text className={styles.formArrow}>›</Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>🏪 店铺与订单</Text>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>预订店铺</Text>
            <Picker
              mode="selector"
              range={shopOptions}
              value={shops.findIndex(s => s.id === form.shopId)}
              onChange={(e) => {
                const shop = shops[e.detail.value];
                if (shop) {
                  updateField('shopId', shop.id);
                  updateField('shopName', shop.name);
                }
              }}
            >
              <View className={styles.formInputWrap}>
                <Input
                  className={styles.formInput}
                  placeholder="选择店铺，或点击后输入"
                  placeholderClass={styles.formInputPlaceholder}
                  value={form.shopName}
                  onInput={(e) => updateField('shopName', e.detail.value)}
                />
                <Text className={styles.formArrow}>›</Text>
              </View>
            </Picker>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>订单日期</Text>
            <Picker
              mode="date"
              value={form.orderDate}
              end={todayStr}
              onChange={(e) => updateField('orderDate', e.detail.value)}
            >
              <View className={styles.formInputWrap}>
                <Input
                  className={styles.formInput}
                  value={form.orderDate}
                  disabled
                />
                <Text className={styles.formArrow}>›</Text>
              </View>
            </Picker>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>店铺订单号</Text>
            <View className={styles.formInputWrap}>
              <Input
                className={styles.formInput}
                placeholder="选填，便于查询"
                placeholderClass={styles.formInputPlaceholder}
                value={form.orderNo}
                onInput={(e) => updateField('orderNo', e.detail.value)}
                maxlength={50}
              />
            </View>
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>💰 价格信息</Text>

          <View className={styles.priceRow}>
            <View className={styles.priceItem}>
              <Text className={styles.priceLabel}>总价</Text>
              <View className={styles.priceInputWrap}>
                <Text className={styles.pricePrefix}>¥</Text>
                <Input
                  type="digit"
                  className={styles.priceInput}
                  placeholder="0"
                  value={form.totalPrice}
                  onInput={(e) => handlePriceChange('totalPrice', e.detail.value)}
                />
              </View>
            </View>
            <View className={styles.priceItem}>
              <Text className={styles.priceLabel}>订金</Text>
              <View className={styles.priceInputWrap}>
                <Text className={styles.pricePrefix}>¥</Text>
                <Input
                  type="digit"
                  className={styles.priceInput}
                  placeholder="0"
                  value={form.deposit}
                  onInput={(e) => handlePriceChange('deposit', e.detail.value)}
                />
              </View>
            </View>
            <View className={styles.priceItem}>
              <Text className={styles.priceLabel}>尾款</Text>
              <View className={styles.priceInputWrap}>
                <Text className={styles.pricePrefix}>¥</Text>
                <Input
                  type="digit"
                  className={styles.priceInput}
                  placeholder="0"
                  value={form.balance}
                  onInput={(e) => handlePriceChange('balance', e.detail.value)}
                />
              </View>
            </View>
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>预计发售月</Text>
            <Picker
              mode="date"
              fields="month"
              value={form.expectedMonth}
              start="2024-01"
              end="2030-12"
              onChange={(e) => updateField('expectedMonth', e.detail.value)}
            >
              <View className={styles.formInputWrap}>
                <Input
                  className={styles.formInput}
                  value={form.expectedMonth ? `${form.expectedMonth.slice(0, 4)}年${parseInt(form.expectedMonth.slice(5))}月` : ''}
                  placeholder="选择年月"
                  disabled
                />
                <Text className={styles.formArrow}>›</Text>
              </View>
            </Picker>
          </View>

          <View className={styles.switchRow}>
            <View className={styles.switchInfo}>
              <Text className={styles.switchLabel}>付款提醒</Text>
              <Text className={styles.switchDesc}>发售前将标记待付款</Text>
            </View>
            <Switch
              checked={form.reminder}
              onChange={(e) => updateField('reminder', e.detail.value)}
              color="#8B5CF6"
            />
          </View>

          {isEdit && (
            <>
              <View className={styles.switchRow}>
                <View className={styles.switchInfo}>
                  <Text className={styles.switchLabel}>标记延期</Text>
                  <Text className={styles.switchDesc}>厂家延期时开启并记录</Text>
                </View>
                <Switch
                  checked={form.isDelayed}
                  onChange={(e) => updateField('isDelayed', e.detail.value)}
                  color="#EF4444"
                />
              </View>

              {form.isDelayed && (
                <View style={{ padding: '24rpx 0' }}>
                  <Text className={styles.textareaLabel}>延期说明</Text>
                  <Textarea
                    className={styles.formTextarea}
                    placeholder="记录延期原因、新的发售时间等"
                    value={form.delayReason}
                    onInput={(e) => updateField('delayReason', e.detail.value)}
                    maxlength={200}
                  />
                </View>
              )}
            </>
          )}
        </View>

        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>📝 备注信息</Text>

          <View style={{ marginBottom: '24rpx' }}>
            <Text className={styles.textareaLabel}>客服沟通备注</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder="记录客服承诺的特典、回复、沟通要点..."
              value={form.customerNotes}
              onInput={(e) => updateField('customerNotes', e.detail.value)}
              maxlength={500}
            />
          </View>

          <View>
            <Text className={styles.textareaLabel}>个人备注</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder="仅自己可见的备注信息..."
              value={form.internalNotes}
              onInput={(e) => updateField('internalNotes', e.detail.value)}
              maxlength={500}
            />
          </View>

          <View className={styles.switchRow} style={{ marginTop: '24rpx' }}>
            <View className={styles.switchInfo}>
              <Text className={styles.switchLabel}>加入收藏关注</Text>
              <Text className={styles.switchDesc}>重点关注的手办标记收藏</Text>
            </View>
            <Switch
              checked={form.isFavorite}
              onChange={(e) => updateField('isFavorite', e.detail.value)}
              color="#F59E0B"
            />
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        {isEdit && (
          <Button className={classnames(styles.btn, styles.btnDelete)} onClick={handleDelete}>
            删除
          </Button>
        )}
        <Button
          className={classnames(styles.btn, styles.btnPrimary)}
          onClick={handleSubmit}
        >
          {isEdit ? '保存修改' : '添加预订'}
        </Button>
      </View>
    </ScrollView>
  );
};

export default OrderEditPage;
