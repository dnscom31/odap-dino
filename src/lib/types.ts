export type Role = 'student' | 'parent' | 'teacher';
export type Subject = 'math' | 'english';
export type EggColor = 'green' | 'blue' | 'orange' | 'purple';

export type Profile = {
  id: string;
  role: Role;
  display_name: string;
  is_under_14: boolean;
  invite_code: string | null;
  created_at: string;
};

export type Dino = {
  student_id: string;
  egg_color: EggColor;
  xp: number;
  level: number;
  streak: number;
  last_active_date: string | null;
};

export type HomeworkTab = {
  id: string;
  student_id: string;
  created_by: string;
  subject: Subject;
  unit: string;
  title: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type Upload = {
  id: string;
  tab_id: string;
  student_id: string;
  image_path: string;
  upload_date: string;
  status: 'submitted' | 'rejected';
  xp_awarded: number;
  created_at: string;
};

export type NoMistakeDay = {
  tab_id: string;
  student_id: string;
  day: string;
};

export type GuardianLink = {
  guardian_id: string;
  student_id: string;
  relation: 'parent' | 'teacher';
};

export type AppSettings = {
  max_level: number;
  daily_upload_limit: number;
  upload_xp: number;
  no_mistake_xp: number;
  streak_bonus_xp: number;
  streak_bonus_every: number;
};

export const SUBJECT_LABEL: Record<Subject, string> = {
  math: '수학',
  english: '영어',
};

export const ROLE_LABEL: Record<Role, string> = {
  student: '학생',
  parent: '학부모',
  teacher: '선생님',
};
