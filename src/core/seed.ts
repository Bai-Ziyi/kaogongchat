import { nextId } from './id';
import type { Message } from './types';

/**
 * 首次打开时预置一段闲聊。
 * 空白的聊天窗口本身就很可疑，而且要装得像在打游戏，不能出现「题」「学」这类字眼。
 */
const LINES: [dir: 'in' | 'out', text: string, gapMs: number][] = [
  ['in', '在吗', 0],
  ['in', '晚上还打不打', 4000],
  ['out', '打', 6 * 60_000],
  ['out', '几点', 3000],
  ['in', '八点半吧 我先吃个饭', 5 * 60_000],
  ['out', '行', 4 * 60_000],
  ['in', '我今天连赢五把', 22 * 60_000],
  ['in', '上分上得手都酸了', 4000],
  ['out', '牛', 3 * 60_000],
  ['in', '你也别老单排了 掉分掉得心疼', 90_000],
  ['out', '知道了我改', 5 * 60_000],
  ['in', '那说好了啊', 2000],
];

export function seedMessages(now = Date.now()): Message[] {
  // 全部落在昨天傍晚到睡前，看起来像一段自然结束的对话
  const start = now - 26 * 60 * 60_000;
  let at = start;
  return LINES.map(([dir, text, gap]) => {
    at += gap;
    return { id: nextId('s'), dir, text, at };
  });
}
