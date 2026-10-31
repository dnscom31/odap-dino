import { useState } from 'react';
import { Alert, View } from 'react-native';

import { DinoView } from '@/components/DinoView';
import { Body, Button, Card, Chip, Field, Heading, Row, Screen, Sub, Title } from '@/components/ui';
import { createProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL, type EggColor, type Role } from '@/lib/types';

const EGG_COLORS: { value: EggColor; label: string }[] = [
  { value: 'green', label: '초록' },
  { value: 'blue', label: '파랑' },
  { value: 'orange', label: '주황' },
  { value: 'purple', label: '보라' },
];

export default function Onboarding() {
  const { refreshProfile, signOut } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [under14, setUnder14] = useState<boolean | null>(null);
  const [egg, setEgg] = useState<EggColor>('green');
  const [busy, setBusy] = useState(false);

  const ready = role !== null && name.trim().length > 0 && (role !== 'student' || under14 !== null);

  const submit = async () => {
    if (!role || !ready) return;
    setBusy(true);
    try {
      await createProfile({ role, name: name.trim(), isUnder14: under14 === true, eggColor: egg });
      await refreshProfile();
    } catch (e) {
      Alert.alert('저장하지 못했어요', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Title>반가워요!</Title>
      <Sub>처음 한 번만 정하면 돼요.</Sub>

      <Heading>누구인가요?</Heading>
      <Row style={{ flexWrap: 'wrap' }}>
        {(['student', 'parent', 'teacher'] as Role[]).map((r) => (
          <Chip key={r} label={ROLE_LABEL[r]} selected={role === r} onPress={() => setRole(r)} />
        ))}
      </Row>

      {role ? (
        <Field
          label={role === 'student' ? '이름 또는 별명 (친구와 선생님에게 보여요)' : '이름 (학생에게 보여요)'}
          value={name}
          onChangeText={setName}
          maxLength={20}
          placeholder={role === 'teacher' ? '예: 김선생님' : role === 'parent' ? '예: 민수 엄마' : '예: 민수'}
        />
      ) : null}

      {role === 'student' ? (
        <>
          <Heading>만 14세 미만인가요?</Heading>
          <Sub>보통 중학교 1~2학년까지예요. 만 14세 미만이면 부모님 동의가 필요해요.</Sub>
          <Row>
            <Chip label="네, 14세 미만이에요" selected={under14 === true} onPress={() => setUnder14(true)} />
            <Chip label="아니요" selected={under14 === false} onPress={() => setUnder14(false)} />
          </Row>

          <Heading>공룡 알을 골라요</Heading>
          <Card style={{ alignItems: 'center' }}>
            <DinoView level={1} color={egg} size={150} />
            <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              {EGG_COLORS.map((c) => (
                <Chip key={c.value} label={c.label} selected={egg === c.value} onPress={() => setEgg(c.value)} />
              ))}
            </Row>
            <Sub style={{ textAlign: 'center', marginTop: 4 }}>오답 사진 10장을 올리면 알이 부화해요!</Sub>
          </Card>
        </>
      ) : null}

      <View style={{ marginTop: 8, gap: 8 }}>
        <Button title="시작하기" onPress={submit} disabled={!ready} busy={busy} />
        <Button title="다른 계정으로 로그인" kind="ghost" onPress={signOut} />
      </View>
      {role && role !== 'student' ? (
        <Body style={{ fontSize: 13, color: '#5D6B5E' }}>
          다음 화면에서 학생의 초대 코드를 입력하면 숙제를 낼 수 있어요.
        </Body>
      ) : null}
    </Screen>
  );
}
