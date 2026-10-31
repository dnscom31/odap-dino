import { Stack } from 'expo-router';

import { colors } from '@/components/ui';

export default function GuardianLayout() {
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
      <Stack.Screen name="index" options={{ title: '우리 학생' }} />
      <Stack.Screen name="new-tab" options={{ title: '숙제 내기', presentation: 'modal' }} />
      <Stack.Screen name="student/[id]" options={{ title: '학생' }} />
    </Stack>
  );
}
