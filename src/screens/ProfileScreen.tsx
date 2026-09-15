import { useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PERSONA, THEME } from '../config';
import { importAvatar, type AvatarSlot } from '../core/profile';
import { getState, setPersona, subscribe } from '../core/store';

async function pickPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}

function Slot({
  label,
  uri,
  placeholder,
  onPress,
}: {
  label: string;
  uri: string | null;
  placeholder: ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.slot} onPress={onPress}>
      {uri ? <Image source={{ uri }} style={styles.slotImage} resizeMode="cover" /> : placeholder}
      <Text style={styles.slotLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const state = useSyncExternalStore(subscribe, getState);
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const choose = async (slot: AvatarSlot) => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickPhoto();
      if (!picked) return;
      const uri = await importAvatar(picked, slot);
      await setPersona(slot === 'their' ? { theirAvatar: uri } : { myAvatar: uri });
    } catch {
      Alert.alert('换头像失败', '换一张试试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>昵称与头像</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>对方</Text>
        <View style={styles.row}>
          <Slot
            label="换头像"
            uri={state.persona.theirAvatar}
            placeholder={
              <Image source={PERSONA.avatarSource} style={styles.slotImage} resizeMode="cover" />
            }
            onPress={() => void choose('their')}
          />
          <View style={styles.field}>
            <Text style={styles.label}>昵称</Text>
            <TextInput
              style={styles.input}
              value={state.persona.name}
              onChangeText={(name) => void setPersona({ name })}
              placeholder="对方显示的名字"
              placeholderTextColor={THEME.subText}
              maxLength={24}
            />
          </View>
        </View>

        <Text style={styles.section}>自己</Text>
        <View style={styles.row}>
          <Slot
            label="换头像"
            uri={state.persona.myAvatar}
            placeholder={
              <View style={[styles.slotImage, styles.slotEmpty]}>
                <Text style={styles.slotLetter}>我</Text>
              </View>
            }
            onPress={() => void choose('my')}
          />
          <Text style={styles.hint}>发出消息那一侧的头像</Text>
        </View>

        <Text style={styles.footnote}>头像从相册选，会拷一份到 App 目录里存着。</Text>
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
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  back: { color: '#4A4A4A', fontSize: 26, width: 44, lineHeight: 30, includeFontPadding: false },
  title: {
    flex: 1,
    textAlign: 'center',
    color: THEME.text,
    fontSize: 17,
    fontWeight: '500',
    includeFontPadding: false,
  },
  content: { padding: 16 },
  section: { color: THEME.subText, fontSize: 13, marginBottom: 10, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: { alignItems: 'center' },
  slotImage: { width: 64, height: 64, borderRadius: 6, backgroundColor: '#E8E8E8' },
  slotEmpty: { alignItems: 'center', justifyContent: 'center' },
  slotLetter: { color: '#FFFFFF', fontSize: 24 },
  slotLabel: { color: THEME.subText, fontSize: 12, marginTop: 6 },
  field: { flex: 1, marginLeft: 16 },
  label: { color: THEME.subText, fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: THEME.text,
    fontSize: 16,
  },
  hint: { flex: 1, color: THEME.subText, fontSize: 13, marginLeft: 16 },
  footnote: { color: THEME.subText, fontSize: 12, lineHeight: 18, marginTop: 24 },
});
