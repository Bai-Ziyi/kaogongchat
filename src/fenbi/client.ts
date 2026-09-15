import * as SecureStore from 'expo-secure-store';
import { FENBI } from '../config';

/**
 * cookie 现在是手动粘贴进来的。
 * 交付前要换成 App 内 WebView 登录后从原生 Cookie 层读取 —— 只要替换
 * 下面这三个函数即可，其余代码不用动。
 */
const TOKEN_KEY = 'sync_token';

/** cookie 失效。服务端用 HTTP 453 表示未登录 */
export class CookieExpiredError extends Error {
  constructor(message: string) {
    super(message || '登录已失效');
    this.name = 'CookieExpiredError';
  }
}

/** 网络不通。调用方应该降级到缓存而不是报错 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function getCookie(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setCookie(raw: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, raw.trim());
}

export async function clearCookie(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** 请求超时，移动网络下不设上限会一直转圈 */
const TIMEOUT_MS = 15000;

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, string>;
  referer?: string;
}

export async function request<T extends object>(url: string, options: RequestOptions = {}): Promise<T> {
  const cookie = await getCookie();
  if (!cookie) throw new CookieExpiredError('还没有设置登录信息');

  const headers: Record<string, string> = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9',
    cookie,
    'user-agent': FENBI.userAgent,
    origin: 'https://www.fenbi.com',
    referer: options.referer ?? 'https://www.fenbi.com/',
  };

  let body: string | undefined;
  if (options.body) {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(options.body).toString();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? '请求超时' : '网络连接失败';
    throw new NetworkError(reason);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 453) {
    const text = await res.text();
    let message = text;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      /* 保持原文 */
    }
    throw new CookieExpiredError(message);
  }

  if (!res.ok) throw new NetworkError(`服务返回 ${res.status}`);

  const json = (await res.json()) as T & { code?: number; msg?: string };
  // create 接口返回裸对象没有 code 字段，combine 系列才有
  if (json.code !== undefined && json.code !== 1) {
    throw new NetworkError(json.msg || `接口返回异常 code=${json.code}`);
  }
  return json;
}
