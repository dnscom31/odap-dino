import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';

import { DinoView } from '@/components/DinoView';
import { TabCard, tabStatus } from '@/components/TabCard';
import { Body, Button, Card, colors, Heading, Loading, Notice, ProgressBar, Row, Screen, Sub } from '@/components/ui';
import { fetchDino, fetchSettings, fetchTabsForStudent, fetchUploads, hasConsent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isSleeping, kstToday } from '@/lib/dates';
import { dinoProgress, LEVEL_NAME } from '@/lib/dino';
import type { AppSettings, Dino, HomeworkTab } from '@/lib/types';

type Data = {
  dino: Dino | null;
  settings: AppSettings;
  tabs: HomeworkTab[];
  todayCount: number;
  consented: boolean;
};

export default function StudentHome() {
  const { profile, signOut } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = kstToday();

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [dino, settings, tabs, uploads, consented] = await Promise.all([
        fetchDino(profile.id),
        fetchSettings(),
        fetchTabsForStudent(profile.id),
        fetchUploads({ studentId: profile.id }),
        profile.is_under_14 ? hasConsent(profile.id) : Promise.resolve(true),
      ]);
      setData({
        dino,
        settings,
        tabs,
        todayCount: uploads.filter((u) => u.upload_date === kstToday()).length,
        consented,
      });
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

  if (!profile || !data) return <Loading />;

  const { dino, settings, tabs, todayCount, consented } = data;
  const open = tabs.filter((t) => tabStatus(t, today) === 'open');
  const upcoming = tabs.filter((t) => tabStatus(t, today) === 'upcoming');
  const closed = tabs.filter((t) => tabStatus(t, today) === 'closed').slice(0, 5);
  const sleeping = dino ? isSleeping(dino.last_active_date, today) : false;
  const progress = dino ? dinoProgress(dino, settings.max_level) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {!consented ? (
        <Notice tone="danger">
          부모님 동의가 아직 없어요. 부모님이 오답 공룡 앱에서 아래 초대 코드로 연결한 뒤 &apos;동의하기&apos;를 눌러 주셔야 사진을 올릴 수 있어요.
        </Notice>
      ) : null}

      {dino && progress ? (
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 13, color: colors.sub }}>{profile.display_name}의 공룡</Text>
          <DinoView level={dino.level} color={dino.egg_color} size={190} sleeping={sleeping} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
            Lv.{dino.level} {LEVEL_NAME[dino.level]}
          </Text>
          {sleeping ? <Sub>쿨쿨 자는 중… 숙제를 하면 깨어나요</Sub> : null}
          <View style={{ alignSelf: 'stretch', marginTop: 10, gap: 6 }}>
            <ProgressBar ratio={progress.ratio} />
            <Sub style={{ textAlign: 'center' }}>{progress.label}</Sub>
          </View>
          <Row style={{ marginTop: 10, gap: 16 }}>
            <Stat label="연속 학습" value={`${dino.streak}일`} />
            <Stat label="오늘 올린 사진" value={`${todayCount}/${settings.daily_upload_limit}`} />
          </Row>
          {settings.streak_bonus_every > 0 ? (
            <Sub style={{ textAlign: 'center', marginTop: 6 }}>
              {settings.streak_bonus_every}일 연속마다 보너스 +{settings.streak_bonus_xp} XP · 숙제 없는 날은 연속이 끊기지 않아요
            </Sub>
          ) : null}
        </Card>
      ) : null}

      <Heading>진행 중인 숙제</Heading>
      {open.length === 0 ? (
        <Card>
          <Body>지금 열려 있는 숙제가 없어요.</Body>
          <Sub>숙제가 없는 날은 연속 학습이 그대로 유지돼요.</Sub>
        </Card>
      ) : (
        open.map((t) => (
          <TabCard key={t.id} tab={t} status="open" onPress={() => router.push({ pathname: '/student/tab/[id]', params: { id: t.id } })} />
        ))
      )}

      {upcoming.length > 0 ? <Heading>예정된 숙제</Heading> : null}
      {upcoming.map((t) => (
        <TabCard key={t.id} tab={t} status="upcoming" onPress={() => router.push({ pathname: '/student/tab/[id]', params: { id: t.id } })} />
      ))}

      {closed.length > 0 ? <Heading>지난 숙제</Heading> : null}
      {closed.map((t) => (
        <TabCard key={t.id} tab={t} status="closed" onPress={() => router.push({ pathname: '/student/tab/[id]', params: { id: t.id } })} />
      ))}

      <Heading>부모님·선생님 연결</Heading>
      <Card style={{ alignItems: 'center' }}>
        <Sub>부모님이나 선생님께 이 코드를 알려 주세요</Sub>
        <Text selectable style={{ fontSize: 32, fontWeight: '800', letterSpacing: 6, color: colors.primary, marginVertical: 6 }}>
          {profile.invite_code}
        </Text>
        <Button
          title="코드 보내기"
          kind="secondary"
          style={{ alignSelf: 'stretch' }}
          onPress={() =>
            Share.share({ message: `오답 공룡 앱에서 '학생 연결'을 누르고 초대 코드 ${profile.invite_code} 를 입력해 주세요.` })
          }
        />
      </Card>

      <Button title="로그아웃" kind="ghost" onPress={signOut} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 96 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.sub }}>{label}</Text>
    </View>
  );
}
