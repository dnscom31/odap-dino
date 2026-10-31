import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsentButton } from '@/components/ConsentButton';
import { DinoView } from '@/components/DinoView';
import { PhotoGrid } from '@/components/PhotoGrid';
import { TabCard, tabStatus } from '@/components/TabCard';
import { Body, Button, Card, colors, Heading, Loading, Notice, Screen, Sub } from '@/components/ui';
import {
  deleteHomeworkTab,
  fetchDino,
  fetchNoMistakeDays,
  fetchTabsForStudent,
  fetchUploads,
  hasConsent,
  rejectUpload,
  signedPhotoUrls,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isSleeping, kstToday, shortDate } from '@/lib/dates';
import { LEVEL_NAME } from '@/lib/dino';
import { supabase } from '@/lib/supabase';
import type { Dino, HomeworkTab, NoMistakeDay, Profile, Upload } from '@/lib/types';

type Data = {
  student: Profile;
  dino: Dino | null;
  consented: boolean;
  isParentLink: boolean;
  tabs: HomeworkTab[];
  uploads: Upload[];
  marks: NoMistakeDay[];
  urls: Record<string, string>;
};

export default function GuardianStudent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [viewing, setViewing] = useState<Upload | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const today = kstToday();

  const load = useCallback(async () => {
    if (!profile || !id) return;
    try {
      const [studentRes, linkRes, dino, consented, tabs, uploads, marks] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('guardian_links').select('relation').eq('guardian_id', profile.id).eq('student_id', id).maybeSingle(),
        fetchDino(id),
        hasConsent(id),
        fetchTabsForStudent(id),
        fetchUploads({ studentId: id }),
        fetchNoMistakeDays({ studentId: id }),
      ]);
      if (!studentRes.data) {
        Alert.alert('학생을 찾을 수 없어요');
        router.back();
        return;
      }
      const urls = await signedPhotoUrls(uploads.slice(0, 60).map((u) => u.image_path));
      setData({
        student: studentRes.data as Profile,
        dino,
        consented,
        isParentLink: linkRes.data?.relation === 'parent',
        tabs,
        uploads,
        marks,
        urls,
      });
    } catch (e) {
      Alert.alert('불러오지 못했어요', e instanceof Error ? e.message : String(e));
    }
  }, [id, profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile || !data) return <Loading />;
  const { student, dino, consented, isParentLink, tabs, uploads, marks, urls } = data;

  const reject = (u: Upload) => {
    Alert.alert('이 사진을 반려할까요?', `숙제와 맞지 않는 사진이면 반려해 주세요.\n학생의 XP가 ${u.xp_awarded} 줄어요. 공룡 레벨은 내려가지 않아요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '반려하기',
        style: 'destructive',
        onPress: async () => {
          setRejecting(true);
          try {
            await rejectUpload(u.id);
            setViewing(null);
            await load();
          } catch (e) {
            Alert.alert('반려하지 못했어요', e instanceof Error ? e.message : String(e));
          } finally {
            setRejecting(false);
          }
        },
      },
    ]);
  };

  const removeTab = (t: HomeworkTab) => {
    Alert.alert('숙제를 지울까요?', `"${t.title}" 숙제와 그 안의 사진 기록이 사라져요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHomeworkTab(t.id);
            await load();
          } catch (e) {
            Alert.alert('지우지 못했어요', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: student.display_name }} />

      {student.is_under_14 && !consented ? (
        isParentLink ? (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
            <Body>만 14세 미만이라 부모님 동의가 필요해요.</Body>
            <ConsentButton studentId={student.id} studentName={student.display_name} onDone={load} />
          </Card>
        ) : (
          <Notice>부모님 동의 전이라 학생이 아직 사진을 올릴 수 없어요.</Notice>
        )
      ) : null}

      {dino ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <DinoView level={dino.level} color={dino.egg_color} size={80} sleeping={isSleeping(dino.last_active_date, today)} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
              Lv.{dino.level} {LEVEL_NAME[dino.level]}
            </Text>
            <Sub>
              {dino.xp} XP · 연속 학습 {dino.streak}일
            </Sub>
            <Sub>마지막 학습: {dino.last_active_date ? shortDate(dino.last_active_date) : '아직 없음'}</Sub>
          </View>
        </Card>
      ) : null}

      <Button title="이 학생에게 숙제 내기" onPress={() => router.push({ pathname: '/guardian/new-tab', params: { studentId: student.id } })} />

      <Heading>숙제 {tabs.length}개</Heading>
      {tabs.length === 0 ? <Sub>아직 낸 숙제가 없어요.</Sub> : null}
      {tabs.map((t) => {
        const tabUploads = uploads.filter((u) => u.tab_id === t.id);
        const tabMarks = marks.filter((m) => m.tab_id === t.id);
        return (
          <View key={t.id} style={{ gap: 8 }}>
            <TabCard
              tab={t}
              status={tabStatus(t, today)}
              right={`사진 ${tabUploads.filter((u) => u.status === 'submitted').length}장`}
            />
            {tabMarks.length > 0 ? (
              <Sub style={{ marginLeft: 4 }}>
                &apos;다 맞았어요&apos; 기록: {tabMarks.map((m) => shortDate(m.day)).join(', ')}
              </Sub>
            ) : null}
            {tabUploads.length > 0 ? <PhotoGrid uploads={tabUploads} urls={urls} onPress={setViewing} /> : null}
            {t.created_by === profile.id ? (
              <Button title="이 숙제 지우기" kind="ghost" onPress={() => removeTab(t)} style={{ minHeight: 36 }} />
            ) : null}
          </View>
        );
      })}

      <Modal visible={viewing !== null} animationType="fade" onRequestClose={() => setViewing(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          {viewing ? (
            <>
              <Pressable style={{ flex: 1 }} onPress={() => setViewing(null)}>
                <Image source={{ uri: urls[viewing.image_path] }} style={{ flex: 1 }} contentFit="contain" />
              </Pressable>
              <View style={{ padding: 16, gap: 8 }}>
                <Text style={{ color: '#FFF', textAlign: 'center' }}>
                  {shortDate(viewing.upload_date)} 올림{viewing.status === 'rejected' ? ' · 반려됨' : ''}
                </Text>
                {viewing.status === 'submitted' ? (
                  <Button title="숙제와 맞지 않아요 · 반려" kind="danger" onPress={() => reject(viewing)} busy={rejecting} />
                ) : null}
                <Button title="닫기" kind="secondary" onPress={() => setViewing(null)} />
              </View>
            </>
          ) : null}
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
