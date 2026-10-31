import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { ConsentButton } from '@/components/ConsentButton';
import { DinoView } from '@/components/DinoView';
import { Body, Button, Card, colors, Field, Heading, Loading, Notice, Row, Screen, Sub } from '@/components/ui';
import { fetchLinkedStudents, linkStudent, type LinkedStudent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isSleeping, kstToday } from '@/lib/dates';
import { LEVEL_NAME } from '@/lib/dino';
import { ROLE_LABEL } from '@/lib/types';

export default function GuardianHome() {
  const { profile, signOut } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);
  const today = kstToday();

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setStudents(await fetchLinkedStudents(profile.id, kstToday()));
    } catch (e) {
      Alert.alert('불러오지 못했어요', e instanceof Error ? e.message : String(e));
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const link = async () => {
    if (code.trim().length < 6) return;
    setLinking(true);
    try {
      const name = await linkStudent(code);
      setCode('');
      Alert.alert('연결됐어요', `${name} 학생과 연결됐어요.`);
      await load();
    } catch (e) {
      Alert.alert('연결하지 못했어요', e instanceof Error ? e.message : String(e));
    } finally {
      setLinking(false);
    }
  };

  if (!profile || students === null) return <Loading />;

  const isParent = profile.role === 'parent';
  const needConsent = students.filter((s) => s.profile.is_under_14 && !s.consented);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Sub>
        {profile.display_name} · {ROLE_LABEL[profile.role]}
      </Sub>

      {isParent &&
        needConsent
          .filter((s) => s.link.relation === 'parent')
          .map((s) => (
            <Card key={s.profile.id} style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
              <Body>{s.profile.display_name} 학생은 만 14세 미만이라 부모님 동의가 필요해요.</Body>
              <ConsentButton studentId={s.profile.id} studentName={s.profile.display_name} onDone={load} />
            </Card>
          ))}
      {!isParent && needConsent.length > 0 ? (
        <Notice>
          {needConsent.map((s) => s.profile.display_name).join(', ')} 학생은 부모님 동의 전이라 아직 사진을 올릴 수 없어요.
          학부모님도 앱에서 학생을 연결하고 동의해 주셔야 해요.
        </Notice>
      ) : null}

      {students.length > 0 ? (
        <Button title="숙제 내기" onPress={() => router.push('/guardian/new-tab')} />
      ) : null}

      <Heading>연결된 학생 {students.length}명</Heading>
      {students.length === 0 ? (
        <Card>
          <Body>아직 연결된 학생이 없어요.</Body>
          <Sub>학생 앱 첫 화면 아래쪽의 초대 코드 6자리를 받아서 입력해 주세요.</Sub>
        </Card>
      ) : (
        students.map((s) => (
          <Card
            key={s.profile.id}
            onPress={() => router.push({ pathname: '/guardian/student/[id]', params: { id: s.profile.id } })}
          >
            <Row style={{ gap: 12 }}>
              {s.dino ? (
                <DinoView level={s.dino.level} color={s.dino.egg_color} size={64} sleeping={isSleeping(s.dino.last_active_date, today)} />
              ) : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{s.profile.display_name}</Text>
                {s.dino ? (
                  <Sub>
                    Lv.{s.dino.level} {LEVEL_NAME[s.dino.level]} · {s.dino.xp} XP · 연속 {s.dino.streak}일
                  </Sub>
                ) : null}
                <Text style={{ fontSize: 14, fontWeight: '600', color: s.todayUploads > 0 ? colors.primary : colors.sub }}>
                  {s.todayUploads > 0 ? `오늘 오답 사진 ${s.todayUploads}장 올림` : '오늘은 아직 안 올렸어요'}
                </Text>
              </View>
            </Row>
          </Card>
        ))
      )}

      <Heading>학생 연결하기</Heading>
      <Card>
        <Field
          label="학생 초대 코드"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder="예: AB12CD"
        />
        <Button title="연결하기" onPress={link} busy={linking} disabled={code.trim().length < 6} />
      </Card>

      <Button title="로그아웃" kind="ghost" onPress={signOut} />
    </Screen>
  );
}
