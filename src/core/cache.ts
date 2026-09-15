import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from './types';

/**
 * 键名都是中性的，别人翻到存储也看不出是什么。
 * 版本号一并作为消息格式的版本 —— 改了结构就升一级，旧数据直接作废，省得写兼容。
 */
const SESSION_KEY = 'session_v2';
const SEEDED_KEY = 'seeded_v2';

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed || !Array.isArray(parsed.pool) || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 存不下就算了，内存里还有，不该因为落盘失败打断刷题
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function isSeeded(): Promise<boolean> {
  return (await AsyncStorage.getItem(SEEDED_KEY)) === '1';
}

export async function markSeeded(): Promise<void> {
  await AsyncStorage.setItem(SEEDED_KEY, '1');
}
