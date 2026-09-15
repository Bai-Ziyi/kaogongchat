import { useEffect, useState, useSyncExternalStore } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatScreen } from './src/chat/ChatScreen';
import { bootstrap, getState, subscribe } from './src/core/store';
import { AccountScreen } from './src/screens/AccountScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

/** 聊天页之外只有一个浮层，用一个状态表示，省得两个布尔值同时为真 */
type Overlay = 'none' | 'account' | 'profile';

export default function App() {
  const state = useSyncExternalStore(subscribe, getState);
  const [overlay, setOverlay] = useState<Overlay>('none');

  useEffect(() => {
    void bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <Screens state={state} overlay={overlay} setOverlay={setOverlay} />
    </SafeAreaProvider>
  );
}

function Screens({
  state,
  overlay,
  setOverlay,
}: {
  state: ReturnType<typeof getState>;
  overlay: Overlay;
  setOverlay: (v: Overlay) => void;
}) {
  if (!state.ready) return <View style={styles.boot} />;
  if (!state.signedIn) return <AccountScreen />;
  if (overlay === 'account') return <AccountScreen onBack={() => setOverlay('none')} />;
  if (overlay === 'profile') return <ProfileScreen onBack={() => setOverlay('none')} />;
  return (
    <ChatScreen
      onOpenSettings={() => setOverlay('account')}
      onOpenProfile={() => setOverlay('profile')}
    />
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: '#EDEDED' },
});
