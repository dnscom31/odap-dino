-- Supabase 보안 점검(advisor) 권고 반영: 함수의 search_path 고정
alter function odap.kst_today() set search_path = '';
alter function odap.level_for_xp(int) set search_path = '';
