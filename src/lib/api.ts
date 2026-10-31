import { PHOTO_BUCKET, supabase } from './supabase';
import type {
  AppSettings,
  Dino,
  EggColor,
  GuardianLink,
  HomeworkTab,
  NoMistakeDay,
  Profile,
  Role,
  Subject,
  Upload,
} from './types';

/** 서버가 보낸 한국어 오류 문구를 그대로 쓰고, 없으면 기본 문구 */
function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

// ---------------------------------------------------------------- 공통

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) fail(error, '프로필을 불러오지 못했어요');
  return data as Profile | null;
}

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (error) fail(error, '설정을 불러오지 못했어요');
  return data as AppSettings;
}

export async function createProfile(input: {
  role: Role;
  name: string;
  isUnder14: boolean;
  eggColor: EggColor;
}): Promise<void> {
  const { error } = await supabase.rpc('create_profile', {
    p_role: input.role,
    p_name: input.name,
    p_is_under_14: input.isUnder14,
    p_egg_color: input.eggColor,
  });
  if (error) fail(error, '프로필을 만들지 못했어요');
}

export async function fetchDino(studentId: string): Promise<Dino | null> {
  const { data, error } = await supabase.from('dinos').select('*').eq('student_id', studentId).maybeSingle();
  if (error) fail(error, '공룡 정보를 불러오지 못했어요');
  return data as Dino | null;
}

export async function fetchTabsForStudent(studentId: string): Promise<HomeworkTab[]> {
  const { data, error } = await supabase
    .from('homework_tabs')
    .select('*')
    .eq('student_id', studentId)
    .order('end_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) fail(error, '숙제를 불러오지 못했어요');
  return (data ?? []) as HomeworkTab[];
}

export async function fetchTab(tabId: string): Promise<HomeworkTab | null> {
  const { data, error } = await supabase.from('homework_tabs').select('*').eq('id', tabId).maybeSingle();
  if (error) fail(error, '숙제를 불러오지 못했어요');
  return data as HomeworkTab | null;
}

export async function fetchUploads(filter: { tabId?: string; studentId?: string }): Promise<Upload[]> {
  let query = supabase.from('uploads').select('*').order('created_at', { ascending: false });
  if (filter.tabId) query = query.eq('tab_id', filter.tabId);
  if (filter.studentId) query = query.eq('student_id', filter.studentId);
  const { data, error } = await query;
  if (error) fail(error, '사진 목록을 불러오지 못했어요');
  return (data ?? []) as Upload[];
}

export async function fetchNoMistakeDays(filter: { tabId?: string; studentId?: string }): Promise<NoMistakeDay[]> {
  let query = supabase.from('no_mistake_days').select('*');
  if (filter.tabId) query = query.eq('tab_id', filter.tabId);
  if (filter.studentId) query = query.eq('student_id', filter.studentId);
  const { data, error } = await query;
  if (error) fail(error, '기록을 불러오지 못했어요');
  return (data ?? []) as NoMistakeDay[];
}

export async function hasConsent(studentId: string): Promise<boolean> {
  const { data, error } = await supabase.from('consents').select('student_id').eq('student_id', studentId).maybeSingle();
  if (error) fail(error, '동의 상태를 불러오지 못했어요');
  return data !== null;
}

/** 사진 여러 장을 잠깐(1시간) 볼 수 있는 주소로 바꿈 */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) fail(error, '사진을 불러오지 못했어요');
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

// ---------------------------------------------------------------- 학생

/** 사진 파일을 저장소에 올리고 숙제 탭에 등록. 등록이 실패하면 올린 파일은 지움 */
export async function submitPhoto(params: {
  studentId: string;
  tabId: string;
  localUri: string;
  mimeType?: string | null;
}): Promise<Dino> {
  const response = await fetch(params.localUri);
  const body = await response.arrayBuffer();
  const contentType = params.mimeType || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const path = `${params.studentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const stored = await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType });
  if (stored.error) fail(stored.error, '사진을 올리지 못했어요');

  const { data, error } = await supabase.rpc('submit_upload', { p_tab_id: params.tabId, p_image_path: path });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    fail(error, '사진을 등록하지 못했어요');
  }
  return data as Dino;
}

export async function markNoMistakes(tabId: string): Promise<Dino> {
  const { data, error } = await supabase.rpc('mark_no_mistakes', { p_tab_id: tabId });
  if (error) fail(error, '기록하지 못했어요');
  return data as Dino;
}

// ---------------------------------------------------------------- 학부모·선생님

export type LinkedStudent = {
  link: GuardianLink;
  profile: Profile;
  dino: Dino | null;
  consented: boolean;
  todayUploads: number;
};

export async function fetchLinkedStudents(guardianId: string, today: string): Promise<LinkedStudent[]> {
  const links = await supabase.from('guardian_links').select('*').eq('guardian_id', guardianId);
  if (links.error) fail(links.error, '학생 목록을 불러오지 못했어요');
  const ids = (links.data ?? []).map((l) => l.student_id as string);
  if (ids.length === 0) return [];

  const [profiles, dinos, consents, uploads] = await Promise.all([
    supabase.from('profiles').select('*').in('id', ids),
    supabase.from('dinos').select('*').in('student_id', ids),
    supabase.from('consents').select('student_id').in('student_id', ids),
    supabase.from('uploads').select('student_id').in('student_id', ids).eq('upload_date', today).eq('status', 'submitted'),
  ]);
  for (const r of [profiles, dinos, consents, uploads]) {
    if (r.error) fail(r.error, '학생 정보를 불러오지 못했어요');
  }

  return (links.data as GuardianLink[])
    .map((link) => {
      const profile = (profiles.data as Profile[]).find((p) => p.id === link.student_id);
      if (!profile) return null;
      return {
        link,
        profile,
        dino: ((dinos.data as Dino[]) ?? []).find((d) => d.student_id === link.student_id) ?? null,
        consented: (consents.data ?? []).some((c) => c.student_id === link.student_id),
        todayUploads: (uploads.data ?? []).filter((u) => u.student_id === link.student_id).length,
      };
    })
    .filter((s): s is LinkedStudent => s !== null)
    .sort((a, b) => a.profile.display_name.localeCompare(b.profile.display_name, 'ko'));
}

export async function linkStudent(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('link_student', { p_invite_code: inviteCode });
  if (error) fail(error, '학생을 연결하지 못했어요');
  return (data as { display_name: string }).display_name;
}

export async function grantConsent(studentId: string): Promise<void> {
  const { error } = await supabase.rpc('grant_consent', { p_student: studentId });
  if (error) fail(error, '동의를 저장하지 못했어요');
}

export async function createHomeworkTab(input: {
  studentIds: string[];
  subject: Subject;
  unit: string;
  title: string;
  start: string;
  end: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc('create_homework_tab', {
    p_student_ids: input.studentIds,
    p_subject: input.subject,
    p_unit: input.unit,
    p_title: input.title,
    p_start: input.start,
    p_end: input.end,
  });
  if (error) fail(error, '숙제를 만들지 못했어요');
  return data as number;
}

export async function deleteHomeworkTab(tabId: string): Promise<void> {
  const { error } = await supabase.from('homework_tabs').delete().eq('id', tabId);
  if (error) fail(error, '숙제를 지우지 못했어요');
}

export async function rejectUpload(uploadId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_upload', { p_upload_id: uploadId });
  if (error) fail(error, '반려하지 못했어요');
}
