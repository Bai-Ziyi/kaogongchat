import type { Inline } from '../core/types';

/**
 * 粉笔下发的 HTML 只用到一个很窄的子集：p、img、br，外加少量行内标签。
 * 所以不引渲染库，自己把标签剥成一串片段。这样题干、解析的拆分和
 * 渲染都只面对同一种结构，落盘也直接是 JSON。
 */

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;

/** 会断行的标签 */
const BREAK = new Set(['p', 'br', 'div', 'tr', 'li']);

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  times: '×',
  divide: '÷',
  deg: '°',
  le: '≤',
  ge: '≥',
  ne: '≠',
  plusmn: '±',
  middot: '·',
  prime: '′',
  Prime: '″',
  there4: '∴',
  radic: '√',
  permil: '‰',
  bull: '•',
  larr: '←',
  rarr: '→',
  uarr: '↑',
  darr: '↓',
};

function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (raw, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : raw;
    }
    return ENTITIES[body] ?? raw;
  });
}

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(raw)) !== null) out[m[1].toLowerCase()] = m[2];
  return out;
}

/** 尺寸写成 "221px"，也可能直接是数字 */
function px(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function parseHtml(html: string): Inline[] {
  const tokens: Inline[] = [];
  const pushText = (raw: string) => {
    const text = decode(raw).replace(/\s+/g, ' ');
    if (text) tokens.push({ t: 'text', v: text });
  };
  const pushBreak = () => {
    const last = tokens[tokens.length - 1];
    if (!last) return;
    if (last.t !== 'br') tokens.push({ t: 'br' });
  };

  let at = 0;
  let m: RegExpExecArray | null;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(html)) !== null) {
    pushText(html.slice(at, m.index));
    at = m.index + m[0].length;

    const closing = m[0][1] === '/';
    const name = m[1].toLowerCase();
    if (name === 'img' && !closing) {
      const a = attrs(m[2]);
      const uri = a.src || a['data-src'];
      if (uri) {
        const w = px(a.width);
        const h = px(a.height);
        tokens.push({
          t: 'img',
          uri: uri.replace(/^\/\//, 'https://'),
          tex: a.flag === 'tex',
          ...(w && h ? { w, h } : {}),
        });
      }
    } else if (BREAK.has(name)) {
      pushBreak();
    }
    // 其余标签（strong、span、table 等）只剥壳，文本照收
  }
  pushText(html.slice(at));

  while (tokens.length && tokens[tokens.length - 1].t === 'br') tokens.pop();
  return tokens;
}

export function toPlain(tokens: Inline[]): string {
  return tokens
    .map((t) => (t.t === 'text' ? t.v : t.t === 'br' ? '\n' : '［图］'))
    .join('')
    .trim();
}

export function isBlank(tokens: Inline[]): boolean {
  return tokens.every((t) => t.t === 'br' || (t.t === 'text' && !t.v.trim()));
}

/**
 * 题干太长就按句号断开，模仿真人一句一句发。
 * 拆的是文本片段，图片和换行原样跟着前一句走，不会被切断。
 */
export function splitSentences(tokens: Inline[], maxLen: number): Inline[][] {
  if (toPlain(tokens).length <= maxLen) return [tokens];

  const sentences: Inline[][] = [];
  let buf: Inline[] = [];

  const flush = () => {
    let start = 0;
    let end = buf.length;
    while (start < end && buf[start].t === 'br') start += 1;
    while (end > start && buf[end - 1].t === 'br') end -= 1;
    const trimmed = buf.slice(start, end);
    if (!isBlank(trimmed)) sentences.push(trimmed);
    buf = [];
  };

  for (const token of tokens) {
    if (token.t !== 'text') {
      buf.push(token);
      continue;
    }
    // 保留句末标点，切在标点之后
    const parts = token.v.split(/(?<=[。！？；])/);
    for (const part of parts) {
      buf.push({ t: 'text', v: part });
      if (/[。！？；]$/.test(part)) flush();
    }
  }
  flush();

  // 断句过碎时按长度并回去，避免连发七八条
  const merged: Inline[][] = [];
  let run: Inline[] = [];
  let len = 0;
  for (const s of sentences) {
    const size = toPlain(s).length;
    if (len && len + size > maxLen) {
      merged.push(run);
      run = [];
      len = 0;
    }
    run = run.concat(s);
    len += size;
  }
  if (!isBlank(run)) merged.push(run);
  return merged.length ? merged : [tokens];
}
