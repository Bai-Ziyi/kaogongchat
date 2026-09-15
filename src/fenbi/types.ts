/** 粉笔接口返回的原始结构，只声明用得到的字段 */

export interface Solution {
  globalId: string;
  content: string;
  accessories?: { options?: string[]; type?: number }[];
  solution?: string;
  source?: string;
  keypoints?: { id: number; name: string }[];
  /** choice 是 0 起算索引的字符串，"3" 对应 D */
  correctAnswer?: { choice?: string; type?: number };
}

export interface Material {
  globalId: string;
  content: string;
}

/** static/exercise 返回的题目树，用来把题目关联到共享材料 */
export interface CardNode {
  key?: string;
  nodeType?: number;
  materialKeys?: string[];
  children?: CardNode[];
}

export interface ContentPayload {
  name?: string;
  materials?: Material[];
  solutions?: Solution[];
  card?: CardNode;
}

export interface CreateExerciseResponse {
  key: string;
  id: number;
  sheet?: { name?: string; questionCount?: number; questionIds?: number[] };
}

export interface GetExerciseResponse {
  code: number;
  data?: { name?: string; staticUrl?: { urls?: string[] } };
}

/** 规整后的题目，界面层只认这个结构 */
export interface Question {
  id: string;
  content: string;
  options: string[];
  /** 0 起算；接口没给答案时为 null */
  answerIndex: number | null;
  answerLetter: string | null;
  solution: string;
  source: string;
  keypoints: string[];
  /** 资料分析题的共享材料，可能为空 */
  materials: string[];
}
