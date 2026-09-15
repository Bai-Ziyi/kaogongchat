import { useEffect, useState, useSyncExternalStore } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatScreen } from './src/chat/ChatScreen';
import { bootstrap, getState, subscribe } from './src/core/store';
import { AccountScreen } from './src/screens/AccountScreen';

export default function App() {
  const state = useSyncExternalStore(subscribe, getState);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <Screens state={state} showAccount={showAccount} setShowAccount={setShowAccount} />
    </SafeAreaProvider>
  );
}

function Screens({
  state,
  showAccount,
  setShowAccount,
}: {
  state: ReturnType<typeof getState>;
  showAccount: boolean;
  setShowAccount: (v: boolean) => void;
}) {
  if (!state.ready) return <View style={styles.boot} />;
  if (!state.signedIn) return <AccountScreen />;
  if (showAccount) return <AccountScreen onBack={() => setShowAccount(false)} />;
  return <ChatScreen onOpenSettings={() => setShowAccount(true)} />;
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: '#EDEDED' },
});
