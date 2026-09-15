import { Image, type ImageSourcePropType } from 'react-native';
import type { StickerKey } from '../core/types';

const SOURCES: Record<StickerKey, ImageSourcePropType> = {
  blob: require('../../assets/表情包/1.png'),
  glasses: require('../../assets/表情包/2.png'),
  meme: require('../../assets/表情包/3.png'),
};

/** 表情包在聊天里占多大 —— 微信的表情就是这么大，没有气泡 */
const BOX = { width: 150, height: 110 };

export function stickerSource(key: StickerKey): ImageSourcePropType {
  return SOURCES[key];
}

/**
 * 打包时 Metro 已经记下了素材原始尺寸，所以不用等加载就能算好显示尺寸，
 * 这样表情包不会先撑开再回缩。
 */
export function stickerSize(key: StickerKey): { width: number; height: number } {
  const asset = Image.resolveAssetSource(SOURCES[key]);
  const w = asset?.width ?? BOX.width;
  const h = asset?.height ?? BOX.height;
  const scale = Math.min(BOX.width / w, BOX.height / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
