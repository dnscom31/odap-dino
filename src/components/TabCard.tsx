import { Text, View } from 'react-native';

import { dateRange } from '@/lib/dates';
import { SUBJECT_LABEL, type HomeworkTab } from '@/lib/types';

import { Card, colors, Row, Sub } from './ui';

/** 숙제 탭 한 개를 보여주는 카드 */
export function TabCard({
  tab,
  status,
  right,
  onPress,
}: {
  tab: HomeworkTab;
  status: 'open' | 'upcoming' | 'closed';
  right?: string;
  onPress?: () => void;
}) {
  const badge = {
    open: { text: '진행 중', bg: colors.primarySoft, fg: colors.primary },
    upcoming: { text: '예정', bg: colors.accentSoft, fg: colors.accent },
    closed: { text: '끝남', bg: '#EEEEEE', fg: colors.sub },
  }[status];

  return (
    <Card onPress={onPress} style={status === 'closed' ? { opacity: 0.7 } : undefined}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ flexShrink: 1 }}>
          <View style={{ backgroundColor: badge.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: badge.fg, fontSize: 12, fontWeight: '700' }}>{badge.text}</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.sub }}>{SUBJECT_LABEL[tab.subject]}</Text>
        </Row>
        {right ? <Text style={{ fontSize: 13, color: colors.sub }}>{right}</Text> : null}
      </Row>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
        {tab.title}
      </Text>
      <Sub>
        {tab.unit ? `${tab.unit} · ` : ''}
        {dateRange(tab.start_date, tab.end_date)}
      </Sub>
    </Card>
  );
}

export function tabStatus(tab: HomeworkTab, today: string): 'open' | 'upcoming' | 'closed' {
  if (today < tab.start_date) return 'upcoming';
  if (today > tab.end_date) return 'closed';
  return 'open';
}
