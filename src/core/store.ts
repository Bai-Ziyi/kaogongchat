import { HINT_ANSWER, letterOf, parseCommand } from '../chat/commands';
import { isBlank, parseHtml, splitSentences } from '../chat/html';
import { KEYPOINTS, PREFETCH_THRESHOLD } from '../config';
import { fetchBatch } from '../fenbi/api';
import { CookieExpiredError, getCookie, NetworkError, setCookie, clearCookie } from '../fenbi/client';
import type { Question } from '../fenbi/types';
import * as cache from './cache';
import { idleBeat, praiseBeat, type Chatter } from './chatter';
import { nextId } from './id';
import { seedMessages } from './seed';
import type { Message, Phase } from './types';

/** 单条消息的文本上限，超过就按句号断开发 */
const STEM_CHUNK = 72;
const MATERIAL_CHUNK = 220;
const SOLUTION_CHUNK = 160;

/** 两条消息之间的停顿，模仿对方在打字 */
const TYPE_DELAY = 480;

/** 内存和磁盘各留多少条历史，刷久了不至于堆成一座山 */
const KEEP_MEMORY = 120;
const KEEP_DISK = 60;

export interface Notice {
  text: string;
  action: 'setup' | 'retry';
}

export interface AppState {
  ready: boolean;
  signedIn: boolean;
  messages: Message[];
  phase: Phase;
  busy: boolean;
  notice: Notice | null;
  stats: { right: number; wrong: number };
  keypointId: number;
}

function defaultKeypoint(): number {
  return Number(Object.keys(KEYPOINTS)[0]);
}

let store: AppState = {
  ready: false,
  signedIn: false,
  messages: [],
  phase: 'idle',
  busy: false,
  notice: null,
  stats: { right: 0, wrong: 0 },
  keypointId: defaultKeypoint(),
};

/** 题目池：游标之前的都已经发到聊天里了 */
let pool: Question[] = [];
let cursor = 0;
let current: Question | null = null;
let lastMaterialKey = '';
let prefetching = false;

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): AppState {
  return store;
}

function patch(next: Partial<AppState>): void {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  void cache.saveSession({
    keypointId: store.keypointId,
    pool,
    cursor,
    messages: store.messages.slice(-KEEP_DISK),
    phase: store.phase,
    current,
    stats: store.stats,
  });
}

function persist(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 700);
}

function push(msg: Omit<Message, 'id' | 'at'>): Message {
  const full: Message = { id: nextId(), at: Date.now(), ...msg };
  patch({ messages: [...store.messages, full].slice(-KEEP_MEMORY) });
  persist();
  return full;
}

function describe(err: unknown): Notice {
  if (err instanceof CookieExpiredError) return { text: '登录已失效', action: 'setup' };
  if (err instanceof NetworkError) return { text: '网络不通', action: 'retry' };
  return { text: '出了点问题', action: 'retry' };
}

async function takeNext(): Promise<Question> {
  if (cursor < pool.length) {
    const q = pool[cursor];
    cursor += 1;
    persistNow();
    return q;
  }
  const batch = await fetchBatch(store.keypointId);
  if (!batch.length) throw new NetworkError('这一批是空的');
  pool = batch;
  cursor = 1;
  persistNow();
  return batch[0];
}

/** 剩得不多就在后台悄悄补一批，别让用户在答题中间等 */
function maybePrefetch(): void {
  if (prefetching || pool.length - cursor > PREFETCH_THRESHOLD) return;
  prefetching = true;
  fetchBatch(store.keypointId)
    .then((batch) => {
      const seen = new Set(pool.map((q) => q.id));
      const fresh = batch.filter((q) => !seen.has(q.id));
      if (!fresh.length) return;
      pool = [...pool, ...fresh];
      persistNow();
    })
    .catch(() => {
      // 预取失败不打扰用户，真要用的时候没题了再报
    })
    .finally(() => {
      prefetching = false;
    });
}

/** 两句废话之间至少隔这么久，不然连珠炮似的反而假 */
const CHATTER_GAP = 15_000;

let lastChatterAt = 0;

/** 闲聊和表情包。纯粹为了让聊天窗不像一个答题机器 */
async function emitChatter(beat: Chatter | null): Promise<void> {
  if (!beat) return;
  const now = Date.now();
  if (now - lastChatterAt < CHATTER_GAP) return;
  lastChatterAt = now;

  if ('sticker' in beat) push({ dir: 'in', sticker: beat.sticker });
  else push({ dir: 'in', text: beat.text });
  persist();
  await sleep(TYPE_DELAY);
}

async function sendQuestion(q: Question): Promise<void> {
  await emitChatter(idleBeat());

  const materialKey = q.materials.join('\u0000');
  if (materialKey && materialKey !== lastMaterialKey) {
    lastMaterialKey = materialKey;
    for (const material of q.materials) {
      for (const chunk of splitSentences(parseHtml(material), MATERIAL_CHUNK)) {
        push({ dir: 'in', body: chunk });
      }
      await sleep(TYPE_DELAY);
    }
  }

  for (const chunk of splitSentences(parseHtml(q.content), STEM_CHUNK)) {
    push({ dir: 'in', body: chunk });
    await sleep(TYPE_DELAY);
  }

  // 一个选项一条消息 —— 挤成一个泡泡既不像聊天，排版也容易出问题
  const options = q.options.map(parseHtml).filter((o) => !isBlank(o));
  for (const [i, option] of options.entries()) {
    push({ dir: 'in', body: [{ t: 'text', v: `${letterOf(i)}. ` }, ...option] });
    await sleep(TYPE_DELAY);
  }
}

async function sendSolution(q: Question): Promise<void> {
  const tokens = parseHtml(q.solution ?? '');
  if (isBlank(tokens)) {
    push({ dir: 'in', text: '这题没给解析' });
    return;
  }
  for (const chunk of splitSentences(tokens, SOLUTION_CHUNK)) {
    push({ dir: 'in', body: chunk });
    await sleep(TYPE_DELAY);
  }
}

async function serveNext(): Promise<void> {
  if (store.busy) return;
  patch({ busy: true, phase: 'idle' });
  try {
    const q = await takeNext();
    await sendQuestion(q);
    current = q;
    patch({ phase: 'answering', busy: false, notice: null });
    persistNow();
    maybePrefetch();
  } catch (err) {
    patch({ busy: false, phase: 'exhausted', notice: describe(err) });
    persistNow();
  }
}

async function answer(chosen: number): Promise<void> {
  const q = current;
  if (!q) return;

  if (q.answerIndex === null) {
    patch({ phase: 'halted' });
    push({ dir: 'in', text: '这道没带答案 你发「下一题」吧' });
    persistNow();
    return;
  }

  if (chosen === q.answerIndex) {
    patch({ stats: { ...store.stats, right: store.stats.right + 1 } });
    push({ dir: 'in', text: '对了' });
    persistNow();
    await sleep(700);
    await emitChatter(praiseBeat());
    await serveNext();
    return;
  }

  patch({ phase: 'halted', stats: { ...store.stats, wrong: store.stats.wrong + 1 } });
  push({ dir: 'in', text: `不对，选 ${letterOf(q.answerIndex)}` });
  persistNow();
  await sleep(TYPE_DELAY);
  await sendSolution(q);
  persistNow();
}

async function initialMessages(): Promise<Message[]> {
  if (await cache.isSeeded()) return [];
  await cache.markSeeded();
  return seedMessages();
}

export async function bootstrap(): Promise<void> {
  const cookie = await getCookie();
  const saved = await cache.loadSession();

  if (saved) {
    pool = saved.pool ?? [];
    cursor = saved.cursor ?? 0;
    current = saved.current ?? null;
    patch({
      keypointId: saved.keypointId ?? store.keypointId,
      messages: saved.messages?.length ? saved.messages : await initialMessages(),
      stats: saved.stats ?? store.stats,
      phase: saved.phase ?? 'idle',
      signedIn: !!cookie,
      ready: true,
    });
  } else {
    patch({ messages: await initialMessages(), signedIn: !!cookie, ready: true });
  }

  // 上次退出时题目还在屏幕上，重启后接着答就行，别重发一遍
  if (store.phase === 'answering' || store.phase === 'halted') {
    persistNow();
    return;
  }
  if (!store.signedIn) {
    // 预置的闲聊也得落盘，否则下次启动 isSeeded 已经为真，聊天窗就空了
    persistNow();
    return;
  }
  await serveNext();
}

export async function signIn(raw: string): Promise<void> {
  await setCookie(raw);
  patch({ signedIn: true, notice: null });
  // 手上还有没答完的题就别打断，只有卡住了才重新取
  if (store.phase === 'answering' || store.phase === 'halted') return;
  await serveNext();
}

export async function signOut(): Promise<void> {
  await clearCookie();
  patch({ signedIn: false, notice: null });
}

export async function useKeypoint(keypointId: number): Promise<void> {
  pool = [];
  cursor = 0;
  current = null;
  lastMaterialKey = '';
  patch({ keypointId, phase: 'idle' });
  persistNow();
  if (store.signedIn) await serveNext();
}

export async function reset(): Promise<void> {
  await cache.clearSession();
  pool = [];
  cursor = 0;
  current = null;
  lastMaterialKey = '';
  patch({ messages: [], phase: 'idle', stats: { right: 0, wrong: 0 }, notice: null });
  if (store.signedIn) await serveNext();
}

export async function retry(): Promise<void> {
  patch({ notice: null });
  await serveNext();
}

export async function submit(raw: string): Promise<void> {
  const text = raw.trim();
  if (!text) return;
  push({ dir: 'out', text });

  const cmd = parseCommand(text);

  if (cmd.kind === 'next') {
    if (store.phase === 'answering') {
      push({ dir: 'in', text: '先答这道' });
      return;
    }
    await serveNext();
    return;
  }

  if (cmd.kind === 'why') {
    if (current) await sendSolution(current);
    return;
  }

  if (cmd.kind === 'answer') {
    if (store.phase === 'answering') {
      await answer(cmd.index);
      return;
    }
    push({ dir: 'in', text: store.phase === 'halted' ? '发「下一题」' : '等会儿' });
    return;
  }

  push({ dir: 'in', text: store.phase === 'answering' ? HINT_ANSWER : '等会儿' });
}
