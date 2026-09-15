import type { StickerKey } from './types';

/**
 * 随机废话库。
 *
 * 目的不是好玩，是让聊天窗别只剩题目 —— 一屏一屏的问答本身就很可疑，
 * 掺进日常闲聊和表情包之后，扫一眼就是个普通聊天。
 *
 * 两条硬规矩：
 *  1. 一句都不能出现「题」「考」「学」「分」这类字眼
 *  2. 得贴人设 —— 一个打王者的朋友在说什么
 */

export type Chatter = { text: string } | { sticker: StickerKey };

/** 日常废话，发在下一道题之前 */
const IDLE = [
  '刚醒 眼睛都睁不开',
  '今天上班摸了一天鱼',
  '外面下雨了 不想出门',
  '饿了 点个外卖先',
  '你那边热不热',
  '手机快没电了 充电器又找不着',
  '地铁上信号好差',
  '晚上想吃烧烤',
  '我妈喊我吃饭了 先撤',
  '刚洗完澡 舒服',
  '这周末你干嘛去',
  '困死了 昨天熬到两点',
  '刚下楼买了瓶水',
  '空调开太低 冻死我了',
  '今天好累啊',
  '在干嘛呢',
  '你睡了吗',
  '刷了会儿视频 一不小心俩小时',
  '刚打了一把 队友太坑了',
  '输麻了 不玩了不玩了',
  '上把翻盘太爽了',
  '刚氪了个皮肤 心疼死了',
  '什么时候开黑啊',
  '我先挂会儿机',
];

/** 答对之后的反应，接在「对了」后面 */
const PRAISE = [
  '可以啊',
  '厉害厉害',
  '这都会',
  '稳',
  '有东西啊',
  '牛',
  '这波可以',
  '行啊你',
  '这么快',
  '我服了',
];

const IDLE_STICKERS: StickerKey[] = ['blob', 'glasses', 'meme'];
const PRAISE_STICKERS: StickerKey[] = ['blob', 'meme'];

/** 每道题边上有多大概率冒一句废话 —— 太高就假了 */
const IDLE_CHANCE = 0.38;
const PRAISE_CHANCE = 0.28;

/** 冒出来的废话里有多少是表情包 */
const STICKER_CHANCE = 0.3;

let lastText = '';

function pickLine(pool: string[]): string {
  for (let i = 0; i < 8; i += 1) {
    const line = pool[Math.floor(Math.random() * pool.length)];
    if (line !== lastText) {
      lastText = line;
      return line;
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function beat(pool: string[], stickers: StickerKey[], chance: number): Chatter | null {
  if (Math.random() > chance) return null;
  if (Math.random() < STICKER_CHANCE) {
    return { sticker: stickers[Math.floor(Math.random() * stickers.length)] };
  }
  return { text: pickLine(pool) };
}

/** 下一道题之前先闲扯一句 */
export function idleBeat(): Chatter | null {
  return beat(IDLE, IDLE_STICKERS, IDLE_CHANCE);
}

/** 答对了，夸一句 */
export function praiseBeat(): Chatter | null {
  return beat(PRAISE, PRAISE_STICKERS, PRAISE_CHANCE);
}
