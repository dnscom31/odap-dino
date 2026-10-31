import { Stack } from 'expo-router';

import { colors } from '@/components/ui';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerBackTitle: '뒤로',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: '내 공룡' }} />
      <Stack.Screen name="tab/[id]" options={{ title: '숙제' }} />
    </Stack>
  );
}
