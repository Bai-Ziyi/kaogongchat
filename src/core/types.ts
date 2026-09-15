import type { Question } from '../fenbi/types';

/**
 * 题干/选项/解析都是 HTML，但在界面层不需要 HTML —— 只需要能落盘、
 * 能拆分、能渲染的一串片段。这些片段同时也是缓存格式，所以必须可 JSON 化。
 */
export type Inline =
  | { t: 'text'; v: string }
  /** tex=true 是公式图，尺寸未知但很小，跟着文字走 */
  | { t: 'img'; uri: string; tex: boolean; w?: number; h?: number }
  | { t: 'br' };

export type StickerKey = 'blob' | 'glasses' | 'meme';

export interface Message {
  id: string;
  dir: 'in' | 'out';
  at: number;
  /** 纯文本消息：闲聊、「对了」这类 */
  text?: string;
  /** 富文本消息：题干、选项、解析 */
  body?: Inline[];
  /** 表情包，只存键名，素材路径由界面层解析 —— 这样落盘的内容和素材无关 */
  sticker?: StickerKey;
}

/** 题目已经发出去，等作答 */
export type Phase = 'answering' | 'halted' | 'idle' | 'exhausted';

export interface Session {
  keypointId: number;
  /** 已下载的题目池，游标之前的都已发过 */
  pool: Question[];
  cursor: number;
  messages: Message[];
  phase: Phase;
  current: Question | null;
  stats: { right: number; wrong: number };
}
