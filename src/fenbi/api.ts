import { BATCH_SIZE, FENBI } from '../config';
import { request } from './client';
import type {
  CardNode,
  ContentPayload,
  CreateExerciseResponse,
  GetExerciseResponse,
  Question,
  Solution,
} from './types';

/** ① 创建一批练习，拿到 combineKey */
export async function createExercise(keypointId: number): Promise<CreateExerciseResponse> {
  const query = new URLSearchParams(FENBI.createParams);
  return request<CreateExerciseResponse>(`${FENBI.host}/api/xingce/exercises?${query}`, {
    method: 'POST',
    body: { ...FENBI.createBody, keypointId: String(keypointId), limit: String(BATCH_SIZE) },
  });
}

/** ② 用 combineKey 换到题目内容地址 */
export async function resolveStaticUrl(combineKey: string): Promise<string> {
  const query = new URLSearchParams({ ...FENBI.getExerciseParams, key: combineKey });
  const json = await request<GetExerciseResponse>(
    `${FENBI.host}/combine/exercise/getExercise?${query}`,
    { referer: 'https://spa.fenbi.com/' },
  );

  const url = json.data?.staticUrl?.urls?.[0];
  if (!url) throw new Error('接口结构变了：响应里没有 staticUrl');
  return url;
}

/**
 * ③ 取回整组题目。
 * staticUrl 只带一个 key，直接请求会 404，必须补上常规参数。
 */
export async function fetchContent(staticUrl: string): Promise<ContentPayload> {
  const url = new URL(staticUrl.replace(/^\/\//, 'https://'));
  for (const [k, v] of Object.entries(FENBI.contentParams)) {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  }
  return request<ContentPayload>(url.toString(), { referer: 'https://spa.fenbi.com/' });
}

/** 展开题目树，收集「题目 → 共享材料」的关联 */
function collectMaterialLinks(card: CardNode | undefined): Map<string, string[]> {
  const links = new Map<string, string[]>();
  const walk = (node: CardNode | undefined) => {
    if (!node) return;
    if (node.nodeType === 2 && node.key) links.set(node.key, node.materialKeys ?? []);
    node.children?.forEach(walk);
  };
  walk(card);
  return links;
}

function toQuestion(solution: Solution, materialMap: Map<string, string>, links: Map<string, string[]>): Question {
  const choice = solution.correctAnswer?.choice;
  const parsed = choice === undefined || choice === null ? null : Number(choice);

  return {
    id: solution.globalId,
    content: solution.content ?? '',
    options: solution.accessories?.[0]?.options ?? [],
    answerIndex: parsed !== null && Number.isFinite(parsed) ? parsed : null,
    answerLetter: parsed !== null && Number.isFinite(parsed) ? String.fromCharCode(65 + parsed) : null,
    solution: solution.solution ?? '',
    source: solution.source ?? '',
    keypoints: (solution.keypoints ?? []).map((k) => k.name),
    materials: (links.get(solution.globalId) ?? []).map((k) => materialMap.get(k) ?? '').filter(Boolean),
  };
}

export function normalize(payload: ContentPayload): Question[] {
  const materialMap = new Map((payload.materials ?? []).map((m) => [m.globalId, m.content]));
  const links = collectMaterialLinks(payload.card);
  return (payload.solutions ?? []).map((s) => toQuestion(s, materialMap, links));
}

/** 三步走完，直接拿到一批可用的题目 */
export async function fetchBatch(keypointId: number): Promise<Question[]> {
  const created = await createExercise(keypointId);
  const staticUrl = await resolveStaticUrl(created.key);
  const payload = await fetchContent(staticUrl);
  return normalize(payload);
}
