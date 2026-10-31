-- =====================================================================
-- 오답 공룡 1단계 데이터베이스
-- Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여 넣고 Run 하세요.
--
-- 점수(XP), 레벨, 연속 학습은 모두 이 파일의 함수 안에서만 바뀝니다.
-- 앱(학생 폰)은 결과를 읽기만 하므로 점수를 조작할 수 없습니다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 운영 설정 (대시보드에서 값만 바꾸면 바로 적용)
-- ---------------------------------------------------------------------
create table public.app_settings (
  id                  int primary key default 1 check (id = 1),
  max_level           int not null default 3,   -- 1단계는 Lv.3까지만. 2단계에서 4로 변경
  daily_upload_limit  int not null default 10,  -- 학생 1명의 하루 업로드 한도
  upload_xp           int not null default 10,  -- 오답 사진 1장
  no_mistake_xp       int not null default 0,   -- "오늘 다 맞았어요" (연속 학습만 유지)
  streak_bonus_xp     int not null default 50,  -- 연속 학습 보너스
  streak_bonus_every  int not null default 3    -- 며칠마다 보너스를 줄지
);
insert into public.app_settings default values;

-- ---------------------------------------------------------------------
-- 2. 테이블
-- ---------------------------------------------------------------------
create type public.user_role     as enum ('student', 'parent', 'teacher');
create type public.link_relation as enum ('parent', 'teacher');
create type public.upload_status as enum ('submitted', 'rejected');
create type public.subject       as enum ('math', 'english');

-- 사용자 프로필 (가입한 사람마다 1줄)
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null,
  display_name  text not null check (char_length(display_name) between 1 and 20),
  is_under_14   boolean not null default false,  -- 학생만 의미 있음
  invite_code   text unique,                     -- 학생만. 학부모·선생님이 이 코드로 연결
  created_at    timestamptz not null default now()
);

-- 학부모·선생님 ↔ 학생 연결
create table public.guardian_links (
  guardian_id  uuid not null references public.profiles (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  relation     public.link_relation not null,
  created_at   timestamptz not null default now(),
  primary key (guardian_id, student_id)
);

-- 만 14세 미만 법정대리인(학부모) 동의
create table public.consents (
  student_id  uuid primary key references public.profiles (id) on delete cascade,
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  granted_at  timestamptz not null default now()
);

-- 공룡 상태 (학생마다 1마리)
create table public.dinos (
  student_id        uuid primary key references public.profiles (id) on delete cascade,
  egg_color         text not null default 'green'
                    check (egg_color in ('green', 'blue', 'orange', 'purple')),
  xp                int not null default 0 check (xp >= 0),
  level             int not null default 1 check (level between 1 and 4),
  streak            int not null default 0,
  last_active_date  date,
  updated_at        timestamptz not null default now()
);

-- 숙제 탭 (기간제: 하루짜리면 시작일 = 종료일)
create table public.homework_tabs (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  subject     public.subject not null,
  unit        text not null default '' check (char_length(unit) <= 40),
  title       text not null check (char_length(title) between 1 and 40),
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date <= 31)
);
create index homework_tabs_student_idx on public.homework_tabs (student_id, start_date, end_date);

-- 오답 사진
create table public.uploads (
  id           uuid primary key default gen_random_uuid(),
  tab_id       uuid not null references public.homework_tabs (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  image_path   text not null,
  upload_date  date not null,  -- 한국 날짜
  status       public.upload_status not null default 'submitted',
  xp_awarded   int not null default 0,
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index uploads_student_day_idx on public.uploads (student_id, upload_date);
create index uploads_tab_idx on public.uploads (tab_id);

-- "오늘 다 맞았어요"
create table public.no_mistake_days (
  tab_id      uuid not null references public.homework_tabs (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  day         date not null,
  created_at  timestamptz not null default now(),
  primary key (student_id, tab_id, day)
);

-- XP 변동 기록 (학부모·선생님이 이유를 볼 수 있게)
create table public.xp_events (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  amount      int not null,
  reason      text not null,  -- upload / upload_rejected / streak_bonus / no_mistake
  ref_id      uuid,
  created_at  timestamptz not null default now()
);
create index xp_events_student_idx on public.xp_events (student_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3. 공용 도우미 함수
-- ---------------------------------------------------------------------
create function public.kst_today() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Seoul')::date
$$;

-- XP로 계산한 레벨 (Lv.1 알 0~99 / Lv.2 100~499 / Lv.3 500~1199 / Lv.4 1200~)
create function public.level_for_xp(p_xp int) returns int
language sql immutable as $$
  select case
    when p_xp >= 1200 then 4
    when p_xp >= 500  then 3
    when p_xp >= 100  then 2
    else 1
  end
$$;

create function public.is_guardian_of(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from guardian_links
    where guardian_id = auth.uid() and student_id = p_student
  )
$$;

create function public.is_parent_of(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from guardian_links
    where guardian_id = auth.uid() and student_id = p_student and relation = 'parent'
  )
$$;

-- 그날 학생에게 열려 있던 숙제 탭이 있었는지
-- (탭을 나중에 만들면서 시작일을 과거로 잡아도, 만든 날 이전은 "열린 날"로 치지 않음)
create function public.had_open_tab(p_student uuid, p_day date) returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1 from homework_tabs t
    where t.student_id = p_student
      and p_day between t.start_date and t.end_date
      and (t.created_at at time zone 'Asia/Seoul')::date <= p_day
  )
$$;

-- XP 더하기/빼기. 레벨은 절대 내려가지 않음 (반려로 XP가 줄어도 외형 유지)
create function public._add_xp(p_student uuid, p_amount int, p_reason text, p_ref uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cap int;
begin
  if p_amount = 0 then
    return;
  end if;
  select max_level into v_cap from app_settings where id = 1;

  update dinos
     set xp         = greatest(0, xp + p_amount),
         level      = greatest(level, least(v_cap, level_for_xp(greatest(0, xp + p_amount)))),
         updated_at = now()
   where student_id = p_student;

  insert into xp_events (student_id, amount, reason, ref_id)
  values (p_student, p_amount, p_reason, p_ref);
end;
$$;

-- 연속 학습 기록
-- 하루라도 "열린 숙제 탭이 있었는데 활동 안 한 날"이 있으면 1일부터 다시.
-- 열린 탭이 아예 없던 날은 학생 잘못이 아니므로 건너뜀(유지).
create function public._record_activity(p_student uuid, p_day date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_last   date;
  v_streak int;
  v_missed boolean;
  s        app_settings%rowtype;
begin
  select * into s from app_settings where id = 1;
  select last_active_date, streak into v_last, v_streak
    from dinos where student_id = p_student for update;

  if v_last is not null and v_last >= p_day then
    return;  -- 오늘은 이미 기록됨
  end if;

  if v_last is null then
    v_streak := 1;
  else
    select exists (
      select 1 from generate_series(v_last + 1, p_day - 1, interval '1 day') as d
      where had_open_tab(p_student, d::date)
    ) into v_missed;
    v_streak := case when v_missed then 1 else v_streak + 1 end;
  end if;

  update dinos
     set streak = v_streak, last_active_date = p_day, updated_at = now()
   where student_id = p_student;

  if s.streak_bonus_every > 0 and v_streak % s.streak_bonus_every = 0 then
    perform _add_xp(p_student, s.streak_bonus_xp, 'streak_bonus', null);
  end if;
end;
$$;

-- 학생이 지금 숙제 탭에 올릴 수 있는 상태인지 검사 (안 되면 에러)
create function public._check_student_can_submit(p_tab_id uuid, p_day date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tab  homework_tabs%rowtype;
  v_prof profiles%rowtype;
begin
  select * into v_prof from profiles where id = auth.uid();
  if v_prof.id is null or v_prof.role <> 'student' then
    raise exception '학생 계정만 올릴 수 있어요';
  end if;

  if v_prof.is_under_14 and not exists (select 1 from consents where student_id = v_prof.id) then
    raise exception '부모님 동의가 필요해요. 부모님 앱에서 동의를 눌러 주세요';
  end if;

  select * into v_tab from homework_tabs where id = p_tab_id;
  if v_tab.id is null or v_tab.student_id <> v_prof.id then
    raise exception '숙제 탭을 찾을 수 없어요';
  end if;
  if p_day < v_tab.start_date or p_day > v_tab.end_date then
    raise exception '이 숙제 탭은 지금 열려 있지 않아요';
  end if;
end;
$$;

-- 현재 공룡 상태를 JSON으로
create function public._dino_json(p_student uuid) returns json
language sql stable security definer set search_path = public as $$
  select row_to_json(d) from dinos d where d.student_id = p_student
$$;

-- ---------------------------------------------------------------------
-- 4. 앱에서 부르는 기능 (RPC)
-- ---------------------------------------------------------------------

-- 가입 직후 프로필 만들기
create function public.create_profile(
  p_role        public.user_role,
  p_name        text,
  p_is_under_14 boolean default false,
  p_egg_color   text default 'green'
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_code  text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i       int;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요해요';
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception '이미 프로필이 있어요';
  end if;

  if p_role = 'student' then
    loop
      v_code := '';
      for i in 1..6 loop
        v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
      end loop;
      exit when not exists (select 1 from profiles where invite_code = v_code);
    end loop;
  end if;

  insert into profiles (id, role, display_name, is_under_14, invite_code)
  values (auth.uid(), p_role, trim(p_name),
          case when p_role = 'student' then coalesce(p_is_under_14, false) else false end,
          v_code);

  if p_role = 'student' then
    insert into dinos (student_id, egg_color) values (auth.uid(), coalesce(p_egg_color, 'green'));
  end if;

  return (select row_to_json(p) from profiles p where p.id = auth.uid());
end;
$$;

-- 학부모·선생님이 학생 초대 코드로 연결
create function public.link_student(p_invite_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me      profiles%rowtype;
  v_student profiles%rowtype;
begin
  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null or v_me.role = 'student' then
    raise exception '학부모·선생님 계정만 학생을 연결할 수 있어요';
  end if;

  select * into v_student from profiles
   where invite_code = upper(trim(p_invite_code)) and role = 'student';
  if v_student.id is null then
    raise exception '초대 코드를 찾을 수 없어요';
  end if;

  insert into guardian_links (guardian_id, student_id, relation)
  values (v_me.id, v_student.id, v_me.role::text::public.link_relation)
  on conflict do nothing;

  return json_build_object('student_id', v_student.id, 'display_name', v_student.display_name);
end;
$$;

-- 학부모가 만 14세 미만 자녀의 가입에 동의 (선생님은 불가)
create function public.grant_consent(p_student uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_parent_of(p_student) then
    raise exception '연결된 학부모만 동의할 수 있어요';
  end if;
  insert into consents (student_id, parent_id) values (p_student, auth.uid())
  on conflict (student_id) do nothing;
end;
$$;

-- 숙제 탭 만들기 (여러 학생에게 한 번에 가능)
create function public.create_homework_tab(
  p_student_ids uuid[],
  p_subject     public.subject,
  p_unit        text,
  p_title       text,
  p_start       date,
  p_end         date
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid;
  v_count   int := 0;
begin
  if p_student_ids is null or array_length(p_student_ids, 1) is null then
    raise exception '학생을 한 명 이상 골라 주세요';
  end if;
  foreach v_student in array p_student_ids loop
    if not is_guardian_of(v_student) then
      raise exception '연결된 학생에게만 숙제를 낼 수 있어요';
    end if;
    insert into homework_tabs (student_id, created_by, subject, unit, title, start_date, end_date)
    values (v_student, auth.uid(), p_subject, coalesce(trim(p_unit), ''), trim(p_title), p_start, p_end);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 학생이 오답 사진 올리기 (사진 파일은 앱이 먼저 저장소에 올린 뒤 경로를 넘김)
create function public.submit_upload(p_tab_id uuid, p_image_path text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_day   date := kst_today();
  v_limit int;
  v_xp    int;
  v_id    uuid;
begin
  perform _check_student_can_submit(p_tab_id, v_day);

  if p_image_path is null or split_part(p_image_path, '/', 1) <> auth.uid()::text then
    raise exception '사진 경로가 올바르지 않아요';
  end if;

  select daily_upload_limit, upload_xp into v_limit, v_xp from app_settings where id = 1;

  -- 같은 학생의 동시 업로드가 한도를 넘지 않도록 공룡 행을 잠금
  perform 1 from dinos where student_id = auth.uid() for update;
  if (select count(*) from uploads where student_id = auth.uid() and upload_date = v_day) >= v_limit then
    raise exception '오늘은 % 장까지만 올릴 수 있어요', v_limit;
  end if;

  insert into uploads (tab_id, student_id, image_path, upload_date, xp_awarded)
  values (p_tab_id, auth.uid(), p_image_path, v_day, v_xp)
  returning id into v_id;

  perform _add_xp(auth.uid(), v_xp, 'upload', v_id);
  perform _record_activity(auth.uid(), v_day);

  return _dino_json(auth.uid());
end;
$$;

-- "오늘 다 맞았어요" (연속 학습 유지)
create function public.mark_no_mistakes(p_tab_id uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_day      date := kst_today();
  v_xp       int;
  v_inserted int;
begin
  perform _check_student_can_submit(p_tab_id, v_day);

  insert into no_mistake_days (tab_id, student_id, day)
  values (p_tab_id, auth.uid(), v_day)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    select no_mistake_xp into v_xp from app_settings where id = 1;
    perform _add_xp(auth.uid(), v_xp, 'no_mistake', p_tab_id);
    perform _record_activity(auth.uid(), v_day);
  end if;

  return _dino_json(auth.uid());
end;
$$;

-- 학부모·선생님이 엉뚱한 사진 반려 (XP 회수, 레벨은 유지)
create function public.reject_upload(p_upload_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_up uploads%rowtype;
begin
  select * into v_up from uploads where id = p_upload_id for update;
  if v_up.id is null or not is_guardian_of(v_up.student_id) then
    raise exception '사진을 찾을 수 없어요';
  end if;
  if v_up.status = 'rejected' then
    return;
  end if;

  update uploads
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_upload_id;

  perform _add_xp(v_up.student_id, -v_up.xp_awarded, 'upload_rejected', v_up.id);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. 접근 권한 (Row Level Security)
--    본인 것, 또는 연결된 학생 것만 읽을 수 있음. 쓰기는 위 함수로만.
-- ---------------------------------------------------------------------
alter table public.app_settings    enable row level security;
alter table public.profiles        enable row level security;
alter table public.guardian_links  enable row level security;
alter table public.consents        enable row level security;
alter table public.dinos           enable row level security;
alter table public.homework_tabs   enable row level security;
alter table public.uploads         enable row level security;
alter table public.no_mistake_days enable row level security;
alter table public.xp_events       enable row level security;

create policy "settings readable" on public.app_settings
  for select to authenticated using (true);

create policy "own or linked profiles" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or is_guardian_of(id)
    or exists (select 1 from guardian_links l where l.student_id = auth.uid() and l.guardian_id = profiles.id)
  );

create policy "own links" on public.guardian_links
  for select to authenticated using (guardian_id = auth.uid() or student_id = auth.uid());

create policy "own or linked consents" on public.consents
  for select to authenticated using (student_id = auth.uid() or is_guardian_of(student_id));

create policy "own or linked dinos" on public.dinos
  for select to authenticated using (student_id = auth.uid() or is_guardian_of(student_id));

create policy "own or linked tabs" on public.homework_tabs
  for select to authenticated using (student_id = auth.uid() or is_guardian_of(student_id));

create policy "creator deletes tab" on public.homework_tabs
  for delete to authenticated using (created_by = auth.uid());

create policy "own or linked uploads" on public.uploads
  for select to authenticated using (student_id = auth.uid() or is_guardian_of(student_id));

create policy "own or linked no-mistake days" on public.no_mistake_days
  for select to authenticated using (student_id = auth.uid() or is_guardian_of(student_id));

create policy "own or linked xp events" on public.xp_events
  for select to authenticated using (student_id = auth.uid() or is_guardian_of(student_id));

-- 테이블은 읽기만 허용 (쓰기는 위 함수로만). 숙제 탭 삭제만 예외.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant delete on public.homework_tabs to authenticated;

-- 내부 함수는 앱에서 직접 부를 수 없게
revoke execute on function public._add_xp(uuid, int, text, uuid) from public, anon, authenticated;
revoke execute on function public._record_activity(uuid, date) from public, anon, authenticated;
revoke execute on function public._check_student_can_submit(uuid, date) from public, anon, authenticated;
revoke execute on function public._dino_json(uuid) from public, anon, authenticated;

-- 앱 기능은 로그인한 사용자만
revoke execute on function public.create_profile(public.user_role, text, boolean, text) from public, anon;
revoke execute on function public.link_student(text) from public, anon;
revoke execute on function public.grant_consent(uuid) from public, anon;
revoke execute on function public.create_homework_tab(uuid[], public.subject, text, text, date, date) from public, anon;
revoke execute on function public.submit_upload(uuid, text) from public, anon;
revoke execute on function public.mark_no_mistakes(uuid) from public, anon;
revoke execute on function public.reject_upload(uuid) from public, anon;
grant execute on function public.create_profile(public.user_role, text, boolean, text) to authenticated;
grant execute on function public.link_student(text) to authenticated;
grant execute on function public.grant_consent(uuid) to authenticated;
grant execute on function public.create_homework_tab(uuid[], public.subject, text, text, date, date) to authenticated;
grant execute on function public.submit_upload(uuid, text) to authenticated;
grant execute on function public.mark_no_mistakes(uuid) to authenticated;
grant execute on function public.reject_upload(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. 사진 저장소 (비공개)
--    경로: <학생 id>/<파일명>.jpg
--    학생은 자기 폴더에만 올리고, 연결된 학부모·선생님만 볼 수 있음
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('wrong-answers', 'wrong-answers', false)
on conflict (id) do nothing;

create policy "student uploads own photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wrong-answers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own or linked photos readable" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wrong-answers'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.guardian_links l
        where l.guardian_id = auth.uid()
          and l.student_id::text = (storage.foldername(name))[1]
      )
    )
  );
