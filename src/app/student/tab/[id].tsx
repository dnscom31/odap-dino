import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { PhotoGrid } from '@/components/PhotoGrid';
import { Body, Button, Card, Heading, Loading, Notice, Screen, Sub, Title } from '@/components/ui';
import {
  fetchDino,
  fetchNoMistakeDays,
  fetchSettings,
  fetchTab,
  fetchUploads,
  hasConsent,
  markNoMistakes,
  signedPhotoUrls,
  submitPhoto,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateRange, kstToday } from '@/lib/dates';
import { LEVEL_NAME } from '@/lib/dino';
import { SUBJECT_LABEL, type AppSettings, type Dino, type HomeworkTab, type Upload } from '@/lib/types';

type Data = {
  tab: HomeworkTab;
  uploads: Upload[];
  urls: Record<string, string>;
  dino: Dino | null;
  settings: AppSettings;
  todayCount: number;
  markedToday: boolean;
  consented: boolean;
};

export default function StudentTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<'camera' | 'library' | 'nomistake' | null>(null);
  const today = kstToday();

  const load = useCallback(async () => {
    if (!profile || !id) return;
    try {
      const tab = await fetchTab(id);
      if (!tab) {
        setMissing(true);
        return;
      }
      const [uploads, allMine, dino, settings, marks, consented] = await Promise.all([
        fetchUploads({ tabId: id }),
        fetchUploads({ studentId: profile.id }),
        fetchDino(profile.id),
        fetchSettings(),
        fetchNoMistakeDays({ tabId: id }),
        profile.is_under_14 ? hasConsent(profile.id) : Promise.resolve(true),
      ]);
      const urls = await signedPhotoUrls(uploads.map((u) => u.image_path));
      const day = kstToday();
      setData({
        tab,
        uploads,
        urls,
        dino,
        settings,
        todayCount: allMine.filter((u) => u.upload_date === day).length,
        markedToday: marks.some((m) => m.day === day),
        consented,
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

  if (missing) {
    return (
      <Screen>
        <Body>숙제를 찾을 수 없어요. 선생님이나 부모님이 지웠을 수 있어요.</Body>
      </Screen>
    );
  }
  if (!profile || !data) return <Loading />;

  const { tab, uploads, urls, dino, settings, todayCount, markedToday, consented } = data;
  const isOpen = tab.start_date <= today && today <= tab.end_date;
  const limitReached = todayCount >= settings.daily_upload_limit;

  /** baseXp: 이번 행동의 기본 점수. 그보다 더 오르면 연속 학습 보너스를 받은 것 */
  const celebrate = (before: Dino | null, after: Dino, baseXp: number) => {
    if (!before) return;
    const bonus = after.xp - before.xp - baseXp;
    if (after.level > before.level) {
      const msg = before.level === 1 ? '알이 부화했어요!' : `${LEVEL_NAME[after.level]}(으)로 진화했어요!`;
      Alert.alert('축하해요!', `${msg}\nLv.${after.level} ${LEVEL_NAME[after.level]}`);
    } else if (bonus > 0) {
      Alert.alert('연속 학습 보너스!', `${after.streak}일 연속! 보너스 +${bonus} XP`);
    }
  };

  const pick = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('카메라 권한이 필요해요', '설정에서 오답 공룡의 카메라 권한을 켜 주세요.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, quality: 0.6 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;

    setBusy(source);
    try {
      const asset = result.assets[0];
      const after = await submitPhoto({ studentId: profile.id, tabId: tab.id, localUri: asset.uri, mimeType: asset.mimeType });
      celebrate(dino, after, settings.upload_xp);
      await load();
    } catch (e) {
      Alert.alert('올리지 못했어요', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const noMistakes = () => {
    Alert.alert('오늘 숙제를 다 맞았나요?', '부모님·선생님이 확인할 수 있어요. 연속 학습이 유지돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '네, 다 맞았어요',
        onPress: async () => {
          setBusy('nomistake');
          try {
            const after = await markNoMistakes(tab.id);
            celebrate(dino, after, settings.no_mistake_xp);
            await load();
          } catch (e) {
            Alert.alert('기록하지 못했어요', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: SUBJECT_LABEL[tab.subject] }} />
      <Title>{tab.title}</Title>
      <Sub>
        {tab.unit ? `${tab.unit} · ` : ''}
        {dateRange(tab.start_date, tab.end_date)}
      </Sub>

      {!consented ? (
        <Notice tone="danger">부모님 동의가 있어야 사진을 올릴 수 있어요.</Notice>
      ) : !isOpen ? (
        <Notice>{today < tab.start_date ? '아직 시작 전인 숙제예요.' : '기간이 끝난 숙제예요.'}</Notice>
      ) : (
        <Card style={{ gap: 10 }}>
          <Body>틀린 문제를 찍어서 올려요. 문제 부분만 잘라서 올리면 좋아요.</Body>
          <Sub>
            오늘 {todayCount}/{settings.daily_upload_limit}장 · 1장에 +{settings.upload_xp} XP
          </Sub>
          <Button title="카메라로 찍기" onPress={() => pick('camera')} busy={busy === 'camera'} disabled={limitReached || busy !== null} />
          <Button
            title="앨범에서 고르기"
            kind="secondary"
            onPress={() => pick('library')}
            busy={busy === 'library'}
            disabled={limitReached || busy !== null}
          />
          {limitReached ? <Sub>오늘은 다 올렸어요. 내일 또 올려 주세요!</Sub> : null}
          <Button
            title={markedToday ? '오늘 다 맞았어요 (기록됨)' : '오늘 다 맞았어요'}
            kind="ghost"
            onPress={noMistakes}
            busy={busy === 'nomistake'}
            disabled={markedToday || busy !== null}
          />
        </Card>
      )}

      <Heading>올린 사진 {uploads.length}장</Heading>
      {uploads.length === 0 ? <Sub>아직 올린 사진이 없어요.</Sub> : <PhotoGrid uploads={uploads} urls={urls} />}
      {uploads.some((u) => u.status === 'rejected') ? (
        <Sub>반려된 사진은 숙제와 맞지 않아 점수가 빠졌어요. 공룡은 그대로예요.</Sub>
      ) : null}
    </Screen>
  );
}
