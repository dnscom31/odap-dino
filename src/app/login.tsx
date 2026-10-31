import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { DinoView } from '@/components/DinoView';
import { Body, Button, Field, Screen, Sub, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      Alert.alert('이메일을 확인해 주세요');
      return;
    }
    if (password.length < 6) {
      Alert.alert('비밀번호는 6자 이상이어야 해요');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: trimmed, password });
        if (error) throw error;
        if (!data.session) {
          Alert.alert('메일함을 확인해 주세요', '가입 확인 메일의 링크를 누른 뒤 로그인하면 돼요.');
          setMode('signin');
        }
      }
    } catch (e) {
      Alert.alert(mode === 'signin' ? '로그인하지 못했어요' : '가입하지 못했어요', toKorean(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <DinoView level={1} color="green" size={140} />
          <Title>오답 공룡</Title>
          <Sub style={{ marginTop: 4 }}>틀린 문제를 다시 풀면 공룡이 자라요</Sub>
        </View>

        <View style={{ marginTop: 16 }}>
          <Field
            label="이메일"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="name@example.com"
          />
          <Field
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signin' ? 'password' : 'new-password'}
            placeholder="6자 이상"
          />
        </View>

        <Button title={mode === 'signin' ? '로그인' : '가입하기'} onPress={submit} busy={busy} />
        <Button
          title={mode === 'signin' ? '처음이에요 · 가입하기' : '이미 계정이 있어요 · 로그인'}
          kind="ghost"
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        />
        {mode === 'signup' ? (
          <Body style={{ fontSize: 13, color: '#5D6B5E' }}>
            만 14세 미만 학생은 가입 후 부모님이 앱에서 동의해 주셔야 사진을 올릴 수 있어요.
          </Body>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function toKorean(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('Invalid login credentials')) return '이메일이나 비밀번호가 맞지 않아요.';
  if (msg.includes('already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (msg.includes('Email not confirmed')) return '가입 확인 메일의 링크를 먼저 눌러 주세요.';
  if (msg.includes('Network request failed')) return '인터넷 연결을 확인해 주세요.';
  return msg;
}
