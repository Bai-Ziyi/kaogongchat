import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import type { Inline } from '../core/types';

/**
 * 题目里有两类图，处理方式不一样：
 *  - flag=tex 的公式图，尺寸很小（实测 107×37），夹在句子中间，必须跟着文字排版
 *  - 带 width/height 属性的插图，是整幅的，单独成行、按标注尺寸显示
 * 所以这里用 RN 自带的 Image —— 它才能塞进 Text 里当行内元素。
 */

const FORMULA_HEIGHT = 20;

/**
 * 气泡宽度是按内容算出来的，宽度不确定；在这种容器里放百分比宽度会让
 * Yoga 算出 0 或者顶破 maxWidth。所以插图一律给确定的宽度。
 * 250 是按 76% 气泡宽减掉内边距估的，够用且不会溢出。
 */
const MAX_BLOCK_WIDTH = Math.min(Math.round(Dimensions.get('window').width * 0.62), 250);

const formulaSizes = new Map<string, { width: number; height: number }>();

function FormulaImage({ uri }: { uri: string }) {
  const [size, setSize] = useState(
    () => formulaSizes.get(uri) ?? { width: 52, height: FORMULA_HEIGHT },
  );

  useEffect(() => {
    if (formulaSizes.has(uri)) return;
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => {
        const fitted = { width: Math.round((w / h) * FORMULA_HEIGHT), height: FORMULA_HEIGHT };
        formulaSizes.set(uri, fitted);
        if (alive) setSize(fitted);
      },
      () => {
        // 拿不到尺寸就用占位尺寸，不影响阅读
      },
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  return <Image source={{ uri }} style={[styles.formula, size]} resizeMode="contain" />;
}

function BlockImage({ uri, w, h }: { uri: string; w?: number; h?: number }) {
  const [ratio, setRatio] = useState<number | null>(w && h ? w / h : null);
  const width = Math.min(w ?? MAX_BLOCK_WIDTH, MAX_BLOCK_WIDTH);

  return (
    <Image
      source={{ uri }}
      style={[styles.block, { width }, ratio ? { aspectRatio: ratio } : styles.blockPending]}
      resizeMode="contain"
      onLoad={(e) => {
        const size = e.nativeEvent.source;
        if (ratio === null && size?.width && size?.height) setRatio(size.width / size.height);
      }}
    />
  );
}

type Segment = { kind: 'text'; parts: Inline[] } | { kind: 'img'; uri: string; w?: number; h?: number };

/** 整幅插图把文字切开，公式图留在文字里 */
function segment(tokens: Inline[]): Segment[] {
  const segments: Segment[] = [];
  let buf: Inline[] = [];

  for (const token of tokens) {
    if (token.t === 'img' && !token.tex) {
      if (buf.length) {
        segments.push({ kind: 'text', parts: buf });
        buf = [];
      }
      segments.push({ kind: 'img', uri: token.uri, w: token.w, h: token.h });
    } else {
      buf.push(token);
    }
  }
  if (buf.length) segments.push({ kind: 'text', parts: buf });
  return segments;
}

export function RichText({ tokens, style }: { tokens: Inline[]; style?: StyleProp<TextStyle> }) {
  const segments = segment(tokens);

  return (
    <View>
      {segments.map((seg, i) =>
        seg.kind === 'img' ? (
          <BlockImage key={i} uri={seg.uri} w={seg.w} h={seg.h} />
        ) : (
          <Text key={i} style={[styles.text, style, i > 0 && styles.spaced]}>
            {seg.parts.map((part, j) =>
              part.t === 'text' ? (
                <Text key={j}>{part.v}</Text>
              ) : part.t === 'br' ? (
                <Text key={j}>{'\n'}</Text>
              ) : (
                <FormulaImage key={j} uri={part.uri} />
              ),
            )}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, lineHeight: 24 },
  spaced: { marginTop: 6 },
  formula: { marginHorizontal: 2, transform: [{ translateY: 2 }] },
  block: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: '#F2F2F2',
  },
  blockPending: { height: 150 },});
