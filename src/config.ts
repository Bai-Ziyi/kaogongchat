import type { ImageSourcePropType } from 'react-native';

/**
 * 人设的出厂值。运行时可以在「昵称与头像」里改，存在本地，重启还在；
 * 这里只在没设置过的时候兜底 —— 头像同理，换过就顶掉这张。
 */
export const PERSONA = {
  name: '人明星稀-王者荣耀',
  avatarSource: require('../assets/头像.jpg') as ImageSourcePropType,
};

/**
 * 已探明的考点。keypointId 在 35330–35360 区间内是连续整数，
 * 完整列表尚未逐一枚举，见 readme。
 */
export const KEYPOINTS: Record<number, string> = {
  35330: '数量关系',
  35331: '判断推理',
  35354: '文字资料',
  35355: '统计表',
  35356: '统计图',
  35357: '综合资料',
  35360: '法律常识',
};

/** 每批取多少题 */
export const BATCH_SIZE = 25;

/** 剩余题目少于此数时后台预取下一批 */
export const PREFETCH_THRESHOLD = 3;

export const FENBI = {
  host: 'https://tiku.fenbi.com',

  /** 创建练习用 */
  createParams: {
    app: 'web',
    kav: '131',
    av: '134',
    hav: '128',
    version: '3.0.0.0',
    deviceId: '',
    gav: '2',
    apcId: '0',
    examcatid: '1000222',
  },
  createBody: {
    type: '151',
    limit: String(BATCH_SIZE),
    exerciseTimeMode: '2',
    yearScope: '0',
    correctRatioLow: '0',
    correctRatioHigh: '1',
  },

  /** getExercise 用 */
  getExerciseParams: {
    format: 'html',
    routecs: 'xingce',
    kav: '125',
    av: '127',
    hav: '125',
    app: 'web',
    apcid: '0',
    deviceId: '',
    gav: '2',
  },

  /**
   * staticUrl 只带一个 key，直接请求会 404，
   * 必须补上这套常规参数才能取到题目。
   */
  contentParams: {
    routecs: 'xingce',
    type: '1',
    kav: '125',
    av: '127',
    hav: '125',
    app: 'web',
    apcid: '0',
    deviceId: '',
    gav: '2',
  },

  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',
};

/** 聊天界面配色，走微信的观感，别人扫一眼就是个普通聊天 */
export const THEME = {
  headerBg: '#EDEDED',
  headerBorder: '#D9D9D9',
  screenBg: '#EDEDED',
  incomingBubble: '#FFFFFF',
  outgoingBubble: '#95EC69',
  text: '#191919',
  subText: '#B2B2B2',
  inputBarBg: '#F7F7F7',
  inputBarBorder: '#D9D9D9',
  danger: '#E64340',
};
