import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../config';
import { getCookie } from '../fenbi/client';
import { signIn } from '../core/store';

/**
 * 开发期的临时入口：手动粘贴 cookie。
 * 朋友手机上做不到这一步，交付前要换成内嵌 WebView 登录后从原生 Cookie 层读取。
 */
export function AccountScreen({ onBack }: { onBack?: () => void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void getCookie().then((c) => {
      if (c) setValue(c);
    });
  }, []);

  const save = async () => {
    const raw = value.trim();
    if (!raw || busy) return;
    setBusy(true);
    await signIn(raw);
    setBusy(false);
    onBack?.();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={8}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.back} />
        )}
        <Text style={styles.title}>账号</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>登录信息</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="粘贴登录信息"
          placeholderTextColor={THEME.subText}
        />
        <Text style={styles.note}>
          从浏览器里复制整条 Cookie 贴进来。内容只存在这台手机上，不会发到别处。
        </Text>

        <TouchableOpacity
          style={[styles.save, value.trim() && !busy ? styles.saveActive : null]}
          onPress={save}
          disabled={!value.trim() || busy}
        >
          <Text style={[styles.saveText, value.trim() && !busy ? styles.saveTextActive : null]}>
            {busy ? '保存中…' : '保存'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
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
  content: { padding: 16 },
  label: { color: THEME.subText, fontSize: 13, marginBottom: 8 },
  input: {
    minHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    borderRadius: 6,
    padding: 10,
    color: THEME.text,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  note: { color: THEME.subText, fontSize: 12, lineHeight: 18, marginTop: 10 },
  save: {
    marginTop: 20,
    backgroundColor: '#E4E4E4',
    borderRadius: 6,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveActive: { backgroundColor: '#07C160' },
  saveText: { color: '#9A9A9A', fontSize: 16 },
  saveTextActive: { color: '#FFFFFF' },
});
