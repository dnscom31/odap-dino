import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchMyProfile } from './api';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  /** 로그인 상태나 프로필을 아직 확인 중 */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** 프로필을 불러오다 네트워크 오류가 났을 때 */
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setProfileUserId(null);
      setProfileError(null);
      return;
    }
    try {
      const p = await fetchMyProfile(s.user.id);
      setProfile(p);
      setProfileError(null);
    } catch (e) {
      setProfile(null);
      setProfileError(e instanceof Error ? e.message : '프로필을 불러오지 못했어요');
    }
    setProfileUserId(s.user.id);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionChecked(true);
      void loadProfile(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // 이 콜백 안에서 바로 Supabase를 다시 부르면 멈출 수 있어 다음 차례로 미룸
      setTimeout(() => {
        if (active) void loadProfile(s);
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileUserId(null);
  }, []);

  const loading = !sessionChecked || (session !== null && profileUserId !== session.user.id);

  return (
    <AuthContext.Provider value={{ loading, session, profile, profileError, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
