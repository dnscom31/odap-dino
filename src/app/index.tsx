import { Redirect } from 'expo-router';

import { Body, Button, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** 첫 화면: 로그인 상태에 맞는 곳으로 보냄 */
export default function Index() {
  const { session, profile, profileError, refreshProfile, signOut } = useAuth();

  if (!session) return <Redirect href="/login" />;

  if (profileError) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Title>연결이 불안정해요</Title>
        <Body>{profileError}</Body>
        <Button title="다시 시도" onPress={refreshProfile} />
        <Button title="로그아웃" kind="ghost" onPress={signOut} />
      </Screen>
    );
  }

  if (!profile) return <Redirect href="/onboarding" />;
  return <Redirect href={profile.role === 'student' ? '/student' : '/guardian'} />;
}
