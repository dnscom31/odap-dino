import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Body, Loading, Screen, Title } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}

function RootStack() {
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (!isSupabaseConfigured) return <NotConfigured />;
  if (loading) return <Loading />;

  const signedIn = session !== null;
  const isStudent = profile?.role === 'student';
  const isGuardian = profile !== null && profile.role !== 'student';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && profile === null}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && isStudent}>
        <Stack.Screen name="student" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && isGuardian}>
        <Stack.Screen name="guardian" />
      </Stack.Protected>
    </Stack>
  );
}

function NotConfigured() {
  return (
    <Screen edges={['top', 'bottom']}>
      <Title>설정이 필요해요</Title>
      <Body>
        Supabase 주소와 키가 아직 없어요. 프로젝트 폴더의 .env.example 파일을 .env 로 복사하고 값을 채운 뒤 앱을 다시 실행해 주세요.
      </Body>
    </Screen>
  );
}
