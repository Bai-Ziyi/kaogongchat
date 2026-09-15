import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { PERSONA } from '../config';
import type { Persona } from './types';

/**
 * 人设和会话分开存：清空聊天记录不该顺手把昵称头像也抹了。
 * 键名同样保持中性。
 */
const PROFILE_KEY = 'profile_v1';

export const DEFAULT_PERSONA: Persona = {
  name: PERSONA.name,
  theirAvatar: null,
  myAvatar: null,
};

export async function loadPersona(): Promise<Persona> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PERSONA;
    const parsed = JSON.parse(raw) as Partial<Persona>;
    return {
      // 名字被清空过就退回默认，否则聊天窗顶上会是一条空白
      name: parsed.name?.trim() ? parsed.name : DEFAULT_PERSONA.name,
      theirAvatar: parsed.theirAvatar ?? null,
      myAvatar: parsed.myAvatar ?? null,
    };
  } catch {
    return DEFAULT_PERSONA;
  }
}

export async function savePersona(persona: Persona): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(persona));
  } catch {
    // 存不下就只在内存里生效，不该因为落盘失败打断使用
  }
}

export type AvatarSlot = 'their' | 'my';

/**
 * 相册返回的是临时文件，系统随时会回收，必须拷进 App 目录再存路径。
 * 每个位置用固定文件名 + overwrite，换头像不会在存储里越攒越多。
 */
export async function importAvatar(source: string, slot: AvatarSlot): Promise<string> {
  const ext = /\.(png|jpe?g|webp|heic)$/i.exec(source)?.[1]?.toLowerCase() ?? 'jpg';
  const dest = new File(Paths.document, `avatar_${slot}.${ext}`);
  await new File(source).copy(dest, { overwrite: true });
  return dest.uri;
}
