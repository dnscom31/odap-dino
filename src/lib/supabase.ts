import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { DEFAULT_SUPABASE_PUBLISHABLE_KEY, DEFAULT_SUPABASE_URL } from './config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

/** .env 파일에 Supabase 주소와 키가 들어 있는지 */
export const isSupabaseConfigured = supabaseUrl.startsWith('https://') && supabaseKey.length > 0;

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://not-configured.supabase.co',
  isSupabaseConfigured ? supabaseKey : 'not-configured',
  {
    // 오답 공룡 데이터는 같은 프로젝트의 다른 서비스와 섞이지 않도록 odap 구역에 있음
    db: { schema: 'odap' },
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// 앱이 화면에 보일 때만 로그인 토큰을 갱신
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export const PHOTO_BUCKET = 'odap-wrong-answers';
