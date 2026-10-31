import { useState } from 'react';
import { Alert } from 'react-native';

import { grantConsent } from '@/lib/api';

import { Button } from './ui';

/** 학부모가 만 14세 미만 자녀의 가입·정보 수집에 동의 */
export function ConsentButton({ studentId, studentName, onDone }: { studentId: string; studentName: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  const ask = () => {
    Alert.alert(
      '법정대리인 동의',
      `${studentName} 학생의 오답 공룡 이용에 동의하시겠어요?\n\n` +
        '· 수집 항목: 이름(별명), 이메일, 오답 사진, 숙제·학습 기록\n' +
        '· 이용 목적: 숙제·오답 관리와 학습 리포트 제공\n' +
        '· 보관 기간: 회원 탈퇴 시까지\n\n' +
        '동의하지 않으면 학생이 사진을 올릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '동의합니다',
          onPress: async () => {
            setBusy(true);
            try {
              await grantConsent(studentId);
              onDone();
            } catch (e) {
              Alert.alert('저장하지 못했어요', e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return <Button title="동의하기" onPress={ask} busy={busy} />;
}
