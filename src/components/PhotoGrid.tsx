import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { shortDate } from '@/lib/dates';
import type { Upload } from '@/lib/types';

import { colors } from './ui';

/** 오답 사진 썸네일 3열 격자 */
export function PhotoGrid({
  uploads,
  urls,
  onPress,
}: {
  uploads: Upload[];
  urls: Record<string, string>;
  onPress?: (upload: Upload) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {uploads.map((u) => (
        <Pressable
          key={u.id}
          onPress={onPress ? () => onPress(u) : undefined}
          style={{ width: '31%', aspectRatio: 0.8, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.line }}
        >
          {urls[u.image_path] ? (
            <Image source={{ uri: urls[u.image_path] }} style={{ flex: 1 }} contentFit="cover" transition={150} />
          ) : null}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 4, backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>
              {shortDate(u.upload_date)}
              {u.status === 'rejected' ? ' · 반려됨' : ''}
            </Text>
          </View>
          {u.status === 'rejected' ? (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(210,72,63,0.35)' }} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
