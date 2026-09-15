import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KEYPOINTS, PERSONA, THEME } from '../config';
import { getState, reset, retry, signOut, submit, subscribe, useKeypoint } from '../core/store';
import type { Message } from '../core/types';
import { MessageBubble } from './MessageBubble';

const TIME_GAP = 5 * 60_000;

function withTimeFlags(messages: Message[]): { message: Message; showTime: boolean }[] {
  return messages.map((message, i) => ({
    message,
    showTime: i === 0 || message.at - messages[i - 1].at > TIME_GAP,
  }));
}

export function ChatScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const state = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<'none' | 'menu' | 'keypoint'>('none');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<{ message: Message; showTime: boolean }>>(null);
  const insets = useSafeAreaInsets();

  // 键盘弹起时底部安全区已经被键盘占住，再留白就会多出一条缝
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setTyping(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setTyping(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const rows = useMemo(() => withTimeFlags(state.messages), [state.messages]);

  const send = useCallback(() => {
    const text = draft;
    setDraft('');
    void submit(text);
  }, [draft]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.back}>‹</Text>
        <Text style={styles.title} numberOfLines={1}>
          {PERSONA.name}
        </Text>
        <TouchableOpacity style={styles.more} onPress={() => setSheet('menu')} hitSlop={8}>
          <Text style={styles.moreText}>···</Text>
        </TouchableOpacity>
      </View>

      {state.notice ? (
        <TouchableOpacity
          style={styles.notice}
          onPress={() => {
            if (state.notice?.action === 'setup') onOpenSettings();
            else void retry();
          }}
        >
          <Text style={styles.noticeText}>{state.notice.text}，点这里重试</Text>
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.message.id}
          renderItem={({ item }) => <MessageBubble message={item.message} showTime={item.showTime} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.inputBar, { paddingBottom: typing ? 8 : Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder=""
            placeholderTextColor={THEME.subText}
            returnKeyType="send"
            submitBehavior="submit"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, draft.trim() ? styles.sendActive : null]}
            onPress={send}
            disabled={!draft.trim()}
          >
            <Text style={styles.sendText}>发送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={sheet !== 'none'} transparent animationType="fade" onRequestClose={() => setSheet('none')}>
        <Pressable style={styles.backdrop} onPress={() => setSheet('none')}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {sheet === 'menu' ? (
              <>
                <Text style={styles.sheetTitle}>{PERSONA.name}</Text>
                <Text style={styles.sheetMeta}>
                  本次答对 {state.stats.right} 题，答错 {state.stats.wrong} 题
                </Text>
                <SheetRow label={`当前内容：${KEYPOINTS[state.keypointId] ?? '未选择'}`} onPress={() => setSheet('keypoint')} />
                <SheetRow label="清空聊天记录" onPress={() => { setSheet('none'); void reset(); }} />
                <SheetRow label="账号" onPress={() => { setSheet('none'); onOpenSettings(); }} />
                <SheetRow label="退出登录" danger onPress={() => { setSheet('none'); void signOut(); }} />
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>换个内容</Text>
                {Object.entries(KEYPOINTS).map(([id, name]) => (
                  <SheetRow
                    key={id}
                    label={name}
                    checked={Number(id) === state.keypointId}
                    onPress={() => {
                      setSheet('none');
                      void useKeypoint(Number(id));
                    }}
                  />
                ))}
              </>
            )}
            <SheetRow label="取消" onPress={() => setSheet('none')} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SheetRow({
  label,
  onPress,
  danger,
  checked,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  checked?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.sheetRow} onPress={onPress}>
      <Text style={[styles.sheetLabel, danger ? styles.sheetDanger : null]}>{label}</Text>
      {checked ? <Text style={styles.check}>✓</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.screenBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.headerBorder,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  back: { color: '#4A4A4A', fontSize: 28, width: 30, lineHeight: 30 },
  title: { flex: 1, textAlign: 'center', color: THEME.text, fontSize: 17, fontWeight: '500' },
  more: { width: 30, alignItems: 'flex-end' },
  moreText: { color: '#4A4A4A', fontSize: 20, lineHeight: 22 },
  notice: { backgroundColor: '#FBF0C8', paddingVertical: 6, paddingHorizontal: 12 },
  noticeText: { color: '#8A6D1F', fontSize: 13 },
  body: { flex: 1 },
  listContent: { paddingTop: 10, paddingBottom: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBarBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.inputBarBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: THEME.text,
    fontSize: 16,
  },
  sendButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 5, marginLeft: 8 },
  sendActive: { backgroundColor: '#DEDEDE' },
  sendText: { color: '#3C3C3C', fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', paddingBottom: 28 },
  sheetTitle: { textAlign: 'center', color: THEME.text, fontSize: 15, paddingTop: 16, paddingBottom: 4 },
  sheetMeta: { textAlign: 'center', color: THEME.subText, fontSize: 13, paddingBottom: 12 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EAEAEA',
  },
  sheetLabel: { color: THEME.text, fontSize: 16 },
  sheetDanger: { color: THEME.danger },
  check: { color: '#07C160', fontSize: 16 },
});
