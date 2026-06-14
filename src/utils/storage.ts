import Taro from '@tarojs/taro';

const STORAGE_PREFIX = 'figure_tracker_';

export const storageKeys = {
  ORDERS: `${STORAGE_PREFIX}orders`,
  SHOPS: `${STORAGE_PREFIX}shops`,
  FAVORITES: `${STORAGE_PREFIX}favorites`,
  SETTINGS: `${STORAGE_PREFIX}settings`
};

export const loadFromStorage = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const res = await Taro.getStorage({ key });
    if (res.data) {
      return JSON.parse(res.data) as T;
    }
    return defaultValue;
  } catch (err) {
    console.warn('[Storage] load failed:', key, err);
    return defaultValue;
  }
};

export const saveToStorage = async (key: string, value: unknown): Promise<boolean> => {
  try {
    await Taro.setStorage({
      key,
      data: JSON.stringify(value)
    });
    return true;
  } catch (err) {
    console.error('[Storage] save failed:', key, err);
    return false;
  }
};

export const removeFromStorage = async (key: string): Promise<boolean> => {
  try {
    await Taro.removeStorage({ key });
    return true;
  } catch (err) {
    console.error('[Storage] remove failed:', key, err);
    return false;
  }
};

export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const formatMonth = (monthStr: string): string => {
  if (!monthStr) return '—';
  const parts = monthStr.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}年${parseInt(parts[1])}月`;
  }
  return monthStr;
};
