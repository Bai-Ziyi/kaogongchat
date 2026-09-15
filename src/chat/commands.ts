export type Command =
  | { kind: 'answer'; index: number }
  | { kind: 'next' }
  | { kind: 'why' }
  | { kind: 'none' };

/** 允许「选A」「答案 B」「1.」这类写法，但必须是整条消息，不能是长句里的片段 */
const ANSWER = /^(?:答案|我选|选)?\s*([1-4A-Da-d])\s*[.。、)）]?$/;
const NEXT = /^(?:下一题|下一道|下一|下题|next|n)$/;
const WHY = /^(?:为什么|解析|答案是什么|why|why\?|为什么\?)$/;

const LETTERS = 'ABCD';

export function parseCommand(raw: string): Command {
  const text = raw.trim().replace(/[　\s]+/g, '');
  if (!text) return { kind: 'none' };

  const lower = text.toLowerCase();
  if (NEXT.test(lower)) return { kind: 'next' };
  if (WHY.test(lower)) return { kind: 'why' };

  const m = ANSWER.exec(text);
  if (m) {
    const ch = m[1].toUpperCase();
    const index = LETTERS.includes(ch) ? LETTERS.indexOf(ch) : Number(ch) - 1;
    if (index >= 0 && index < 4) return { kind: 'answer', index };
  }
  return { kind: 'none' };
}

export const HINT_ANSWER = '发 1~4 或者 A~D';

/** 答错时把正确选项报出来，用字母更像人在说话 */
export function letterOf(index: number | null): string {
  return index === null ? '?' : LETTERS[index] ?? '?';
}
