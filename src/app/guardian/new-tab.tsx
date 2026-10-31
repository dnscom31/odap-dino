import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Body, Button, Card, Chip, Field, Heading, Loading, Row, Screen, Sub } from '@/components/ui';
import { createHomeworkTab, fetchLinkedStudents, type LinkedStudent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, dateRange, kstToday } from '@/lib/dates';
import { SUBJECT_LABEL, type Subject } from '@/lib/types';

const STARTS = [
  { label: '오늘부터', offset: 0 },
  { label: '내일부터', offset: 1 },
];
const LENGTHS = [
  { label: '하루', days: 1 },
  { label: '3일', days: 3 },
  { label: '일주일', days: 7 },
  { label: '2주', days: 14 },
];

export default function NewTab() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ studentId?: string }>();
  const [students, setStudents] = useState<LinkedStudent[] | null>(null);
  const [selected, setSelected] = useState<string[]>(params.studentId ? [params.studentId] : []);
  const [subject, setSubject] = useState<Subject>('math');
  const [unit, setUnit] = useState('');
  const [title, setTitle] = useState('');
  const [startOffset, setStartOffset] = useState(0);
  const [length, setLength] = useState(7);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchLinkedStudents(profile.id, kstToday())
      .then((list) => {
        setStudents(list);
        if (list.length === 1) setSelected([list[0].profile.id]);
      })
      .catch((e) => Alert.alert('불러오지 못했어요', e instanceof Error ? e.message : String(e)));
  }, [profile]);

  if (!students) return <Loading />;

  const start = addDays(kstToday(), startOffset);
  const end = addDays(start, length - 1);
  const ready = selected.length > 0 && title.trim().length > 0;

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    setBusy(true);
    try {
      const n = await createHomeworkTab({ studentIds: selected, subject, unit, title, start, end });
      Alert.alert('숙제를 냈어요', `${n}명에게 숙제 탭이 생겼어요.`);
      router.back();
    } catch (e) {
      Alert.alert('숙제를 만들지 못했어요', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Heading>누구에게 낼까요?</Heading>
      <Row style={{ flexWrap: 'wrap' }}>
        {students.map((s) => (
          <Chip key={s.profile.id} label={s.profile.display_name} selected={selected.includes(s.profile.id)} onPress={() => toggle(s.profile.id)} />
        ))}
      </Row>
      {students.length > 1 ? (
        <Button
          title={selected.length === students.length ? '모두 해제' : '모두 선택'}
          kind="ghost"
          onPress={() => setSelected(selected.length === students.length ? [] : students.map((s) => s.profile.id))}
        />
      ) : null}

      <Heading>과목</Heading>
      <Row>
        {(['math', 'english'] as Subject[]).map((s) => (
          <Chip key={s} label={SUBJECT_LABEL[s]} selected={subject === s} onPress={() => setSubject(s)} />
        ))}
      </Row>

      <Field label="숙제 이름" value={title} onChangeText={setTitle} maxLength={40} placeholder="예: 쎈 B단계 30~45번" />
      <Field label="단원 (선택)" value={unit} onChangeText={setUnit} maxLength={40} placeholder="예: 분수의 나눗셈" />

      <Heading>기간</Heading>
      <Row style={{ flexWrap: 'wrap' }}>
        {STARTS.map((s) => (
          <Chip key={s.offset} label={s.label} selected={startOffset === s.offset} onPress={() => setStartOffset(s.offset)} />
        ))}
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        {LENGTHS.map((l) => (
          <Chip key={l.days} label={l.label} selected={length === l.days} onPress={() => setLength(l.days)} />
        ))}
      </Row>
      <Card>
        <Body>{dateRange(start, end)}</Body>
        <Sub>기간 안에는 주말에도 나눠서 올릴 수 있어요. 숙제가 없는 날은 학생의 연속 학습이 끊기지 않아요.</Sub>
      </Card>

      <Button title="숙제 내기" onPress={submit} disabled={!ready} busy={busy} />
    </Screen>
  );
}
