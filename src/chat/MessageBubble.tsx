import { Image, StyleSheet, Text, View } from 'react-native';
import { PERSONA, THEME } from '../config';
import type { Message, StickerKey } from '../core/types';
import { RichText } from './RichText';
import { stickerSize, stickerSource } from './stickers';

export function formatTime(at: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function Avatar({ mine }: { mine: boolean }) {
  if (!mine) {
    return <Image source={PERSONA.avatarSource} style={styles.avatar} resizeMode="cover" />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarLetter}>我</Text>
    </View>
  );
}

function Sticker({ name }: { name: StickerKey }) {
  return <Image source={stickerSource(name)} style={stickerSize(name)} resizeMode="contain" />;
}

export function MessageBubble({ message, showTime }: { message: Message; showTime: boolean }) {
  const mine = message.dir === 'out';

  return (
    <View>
      {showTime ? <Text style={styles.time}>{formatTime(message.at)}</Text> : null}
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        {!mine ? <Avatar mine={false} /> : null}

        <View style={styles.bubbleWrap}>
          {/* 表情包没有气泡底，微信就是这么显示的 */}
          {message.sticker ? <Sticker name={message.sticker} /> : null}

          {message.sticker ? null : (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <View style={[styles.arrow, mine ? styles.arrowMine : styles.arrowTheirs]} />

              {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
              {message.body ? <RichText tokens={message.body} style={styles.text} /> : null}
            </View>
          )}
        </View>

        {mine ? <Avatar mine /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  time: {
    alignSelf: 'center',
    color: THEME.subText,
    fontSize: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, marginBottom: 12 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 4, backgroundColor: '#D8D8D8' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 16 },
  // 泡泡宽度由内容决定，必须允许收缩，否则长内容会顶破 maxWidth
  bubbleWrap: { maxWidth: '76%', flexShrink: 1 },
  bubble: { borderRadius: 5, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleTheirs: { backgroundColor: THEME.incomingBubble, marginLeft: 8 },
  bubbleMine: { backgroundColor: THEME.outgoingBubble, marginRight: 8 },
  arrow: {
    position: 'absolute',
    top: 13,
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
  },
  arrowTheirs: { left: -4, backgroundColor: THEME.incomingBubble },
  arrowMine: { right: -4, backgroundColor: THEME.outgoingBubble },
  text: { color: THEME.text },
});
