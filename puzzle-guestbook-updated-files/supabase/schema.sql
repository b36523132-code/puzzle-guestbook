-- ============================================================================
-- 실시간 참여형 퍼즐 방명록 - Supabase 스키마
-- 이 파일 전체를 Supabase 프로젝트의 SQL Editor에 붙여넣고 실행하세요.
-- (Supabase 대시보드 → SQL Editor → New query → 이 파일 내용 전체 붙여넣기 → Run)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. 확장 기능
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid() 사용을 위해

-- ----------------------------------------------------------------------------
-- 1. boards 테이블 : 퍼즐판 (몇 번째 퍼즐인지)
-- ----------------------------------------------------------------------------
create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  board_number int not null unique,
  status text not null default 'active' check (status in ('active', 'completed')),
  total_pieces int not null default 48,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 활성 board 는 항상 하나만 존재해야 한다 (status='active' 인 행이 2개 이상이면 안 됨)
create unique index if not exists boards_single_active_idx
  on boards (status)
  where status = 'active';

create index if not exists boards_board_number_idx on boards (board_number desc);

-- ----------------------------------------------------------------------------
-- 2. participants 테이블 : 참가자 = 퍼즐 조각 한 개
-- ----------------------------------------------------------------------------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 10),
  message varchar(35),
  puzzle_position int not null check (puzzle_position >= 0),
  relay_number bigint not null,
  color_variant text not null default 'purple',
  emojis text[] not null default '{}',
  emoji_positions text[] not null default '{}',
  board_id uuid not null references boards (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint emojis_max_3 check (array_length(emojis, 1) is null or array_length(emojis, 1) <= 3),
  constraint emoji_positions_match check (
    (array_length(emojis, 1) is null and array_length(emoji_positions, 1) is null)
    or array_length(emojis, 1) = array_length(emoji_positions, 1)
  )
);

-- ----------------------------------------------------------------------------
-- 2-b. migration: 기존에 이미 만들어진 DB(participants 테이블에 message 컬럼이 없는 경우)에
--      안전하게 컬럼을 추가한다. 새로 스키마를 통째로 실행하는 경우에는 위 CREATE TABLE 에
--      이미 포함되어 있으므로 아무 일도 일어나지 않는다 (IF NOT EXISTS). 기존 행의 데이터는
--      전혀 건드리지 않는다.
-- ----------------------------------------------------------------------------
alter table participants add column if not exists message varchar(35);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'message_max_length'
  ) then
    alter table participants
      add constraint message_max_length check (message is null or char_length(message) <= 35);
  end if;
end $$;

-- 한 보드 안에서 같은 위치에 두 명이 들어갈 수 없다 (동시성 안전장치의 최종 방어선)
create unique index if not exists participants_board_position_unique
  on participants (board_id, puzzle_position);

-- relay_number 는 전역적으로 절대 중복되면 안 된다
create unique index if not exists participants_relay_number_unique
  on participants (relay_number);

create index if not exists participants_board_id_idx on participants (board_id);

-- relay_number 를 "전역적으로 안전하게" 발급하기 위한 시퀀스.
-- nextval() 호출은 PostgreSQL 이 보장하는 원자적 연산이라
-- 동시에 여러 요청이 들어와도 같은 번호가 절대 나오지 않는다.
create sequence if not exists relay_number_seq start 1;

-- ----------------------------------------------------------------------------
-- 3. 참가 등록 RPC : join_puzzle
--    - 이름/색상/이모지를 받아서
--      1) 현재 active board 조회 (없으면 생성)
--      2) 비어있는 퍼즐 위치 중 하나를 랜덤으로 선점
--      3) 전역 relay_number 발급
--      4) participants 에 저장
--      5) 보드가 가득 차면 completed 처리 + 다음 board 자동 생성
--    까지 전부 하나의 트랜잭션 + advisory lock 으로 원자적으로 처리한다.
--    => 두 명이 완전히 동시에 요청해도 같은 relay_number / 같은 위치가 절대 나오지 않는다.
-- ----------------------------------------------------------------------------
-- 기존(인자 4개) 버전이 남아있으면 먼저 지운다. `create or replace function` 은 인자 목록이
-- 달라지면 "교체"가 아니라 같은 이름의 또 다른 오버로드를 새로 만들어버리기 때문에,
-- 명시적으로 drop 한 뒤 새 시그니처(인자 5개, p_message 추가)로 다시 만든다.
drop function if exists join_puzzle(text, text, text[], text[]);

create or replace function join_puzzle(
  p_name text,
  p_color_variant text default 'purple',
  p_emojis text[] default '{}',
  p_emoji_positions text[] default '{}',
  p_message text default ''
)
returns table (
  participant_id uuid,
  relay_number bigint,
  puzzle_position int,
  board_id uuid,
  board_number int,
  total_pieces int,
  board_completed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_message text;
  v_color text;
  v_board_id uuid;
  v_board_number int;
  v_total_pieces int;
  v_empty_positions int[];
  v_chosen_position int;
  v_relay_number bigint;
  v_participant_id uuid;
  v_filled_count int;
  v_board_completed boolean := false;
  v_emoji_count int;
  v_valid_colors text[] := array[
    'purple','lavender','yellow','lime','sky','blue','coral','pink','orange','mint'
  ];
begin
  -- ---- 입력값 검증 (프론트엔드 검증만 믿지 않고 서버에서 재검증) ----
  v_name := trim(coalesce(p_name, ''));
  if v_name = '' then
    raise exception 'name_required' using errcode = 'P0001';
  end if;
  if char_length(v_name) > 10 then
    raise exception 'name_too_long' using errcode = 'P0001';
  end if;

  v_message := nullif(trim(coalesce(p_message, '')), '');
  if v_message is not null and char_length(v_message) > 35 then
    raise exception 'message_too_long' using errcode = 'P0001';
  end if;

  v_color := coalesce(p_color_variant, 'purple');
  if not (v_color = any(v_valid_colors)) then
    v_color := 'purple';
  end if;

  v_emoji_count := coalesce(array_length(p_emojis, 1), 0);
  if v_emoji_count > 3 then
    raise exception 'too_many_emojis' using errcode = 'P0001';
  end if;
  if v_emoji_count <> coalesce(array_length(p_emoji_positions, 1), 0) then
    raise exception 'emoji_position_mismatch' using errcode = 'P0001';
  end if;

  -- ---- 동시성 제어: 보드 배정/위치 배정을 전역적으로 직렬화 ----
  -- 같은 순간에 여러 요청이 들어와도 이 lock 을 먼저 획득한 트랜잭션부터
  -- 순서대로 처리되고, 끝나면(commit/rollback) 자동으로 풀린다.
  perform pg_advisory_xact_lock(hashtext('puzzle_board_assignment'));

  -- ---- 1) 현재 active board 조회, 없으면 새로 생성 ----
  -- 주의: RETURNS TABLE 의 출력 컬럼명(board_number, total_pieces, board_id 등)과
  -- 실제 테이블 컬럼명이 겹치기 때문에, 이 함수 안에서는 반드시 테이블 별칭을 붙여서
  -- "PL/pgSQL 변수냐 테이블 컬럼이냐" 모호성(ambiguous column reference) 오류를 피한다.
  select b.id, b.board_number, b.total_pieces
    into v_board_id, v_board_number, v_total_pieces
  from boards b
  where b.status = 'active'
  order by b.board_number desc
  limit 1;

  if v_board_id is null then
    insert into boards as b (board_number, status, total_pieces)
    values (1, 'active', 48)
    returning b.id, b.board_number, b.total_pieces
      into v_board_id, v_board_number, v_total_pieces;
  end if;

  -- ---- 2) 비어있는 위치 계산 후 랜덤으로 하나 선점 ----
  select array_agg(pos) into v_empty_positions
  from generate_series(0, v_total_pieces - 1) as pos
  where pos not in (
    select prt.puzzle_position from participants prt where prt.board_id = v_board_id
  );

  -- 이론상 도달하면 안 되지만, 방어적으로 보드가 꽉 찬 경우 새 보드를 만든다
  if v_empty_positions is null or array_length(v_empty_positions, 1) = 0 then
    update boards b set status = 'completed', completed_at = now()
      where b.id = v_board_id and b.status = 'active';

    insert into boards as b (board_number, status, total_pieces)
    values (v_board_number + 1, 'active', v_total_pieces)
    returning b.id, b.board_number, b.total_pieces
      into v_board_id, v_board_number, v_total_pieces;

    v_empty_positions := array(select generate_series(0, v_total_pieces - 1));
  end if;

  v_chosen_position := v_empty_positions[1 + floor(random() * array_length(v_empty_positions, 1))::int];

  -- ---- 3) 전역 참가 순번 발급 (원자적) ----
  v_relay_number := nextval('relay_number_seq');

  -- ---- 4) 참가자 저장 ----
  insert into participants as prt (
    name, message, puzzle_position, relay_number, color_variant, emojis, emoji_positions, board_id
  ) values (
    v_name, v_message, v_chosen_position, v_relay_number, v_color,
    coalesce(p_emojis, '{}'), coalesce(p_emoji_positions, '{}'), v_board_id
  )
  returning prt.id into v_participant_id;

  -- ---- 5) 보드가 가득 찼는지 확인 → completed 처리 + 다음 board 자동 생성 ----
  select count(*) into v_filled_count from participants prt where prt.board_id = v_board_id;

  if v_filled_count >= v_total_pieces then
    update boards b set status = 'completed', completed_at = now()
      where b.id = v_board_id and b.status = 'active';

    insert into boards (board_number, status, total_pieces)
    values (v_board_number + 1, 'active', v_total_pieces);

    v_board_completed := true;
  end if;

  return query select
    v_participant_id,
    v_relay_number,
    v_chosen_position,
    v_board_id,
    v_board_number,
    v_total_pieces,
    v_board_completed;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. 최초 board 보장: 이미 하나라도 있으면 건너뜀
-- ----------------------------------------------------------------------------
insert into boards (board_number, status, total_pieces)
select 1, 'active', 48
where not exists (select 1 from boards);

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
--    일반 사용자(anon)는 "조회"와 "join_puzzle RPC 실행"만 가능하다.
--    테이블에 직접 INSERT / UPDATE / DELETE 하는 권한은 아무에게도 주지 않는다.
-- ----------------------------------------------------------------------------
alter table boards enable row level security;
alter table participants enable row level security;

drop policy if exists "boards_public_read" on boards;
create policy "boards_public_read" on boards
  for select
  using (true);

drop policy if exists "participants_public_read" on participants;
create policy "participants_public_read" on participants
  for select
  using (true);

-- INSERT/UPDATE/DELETE 정책을 아예 만들지 않으므로 RLS 가 기본적으로 모두 차단한다.
-- (anon/authenticated 역할에는 테이블에 대한 INSERT/UPDATE/DELETE 권한 자체도 주지 않는다)
revoke insert, update, delete on boards from anon, authenticated;
revoke insert, update, delete on participants from anon, authenticated;
grant select on boards to anon, authenticated;
grant select on participants to anon, authenticated;

-- join_puzzle 함수는 SECURITY DEFINER 로 정의되어 있어 함수 소유자 권한으로 실행된다.
-- anon/authenticated 역할에게 "이 함수를 호출할 권한"만 명시적으로 부여한다.
grant execute on function join_puzzle(text, text, text[], text[], text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Realtime 설정
--    Supabase 대시보드에서 Database → Replication (또는 Table Editor 상단의
--    Realtime 토글)에서 boards, participants 테이블의 Realtime 을 켜주세요.
--    아래 명령은 SQL로 동일한 작업을 수행합니다 (이미 추가되어 있으면 에러 없이 무시됨).
-- ----------------------------------------------------------------------------
do $$
begin
  -- supabase_realtime publication 은 Supabase 프로젝트에는 기본적으로 존재한다.
  -- (이 스크립트를 Supabase 가 아닌 일반 PostgreSQL 에서 테스트하는 경우에는 존재하지 않을 수 있으므로 건너뛴다)
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'participants'
    ) then
      alter publication supabase_realtime add table participants;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'boards'
    ) then
      alter publication supabase_realtime add table boards;
    end if;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 7. 관리자 전용: relay_number_seq 시퀀스를 1부터 재시작
--    일반 사용자(anon/authenticated)는 절대 호출할 수 없고,
--    Service Role Key 로만 호출 가능한 관리자 초기화 API(/api/admin/reset)에서 사용한다.
-- ----------------------------------------------------------------------------
create or replace function admin_reset_relay_sequence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter sequence relay_number_seq restart with 1;
end;
$$;

revoke execute on function admin_reset_relay_sequence() from public, anon, authenticated;
grant execute on function admin_reset_relay_sequence() to service_role;

-- ============================================================================
-- 완료. 아래 "전체 현황 뷰"는 관리자 페이지 등에서 참고용으로 사용할 수 있습니다.
-- ============================================================================
create or replace view board_progress as
select
  b.id as board_id,
  b.board_number,
  b.status,
  b.total_pieces,
  count(p.id) as filled_pieces,
  b.created_at,
  b.completed_at
from boards b
left join participants p on p.board_id = b.id
group by b.id, b.board_number, b.status, b.total_pieces, b.created_at, b.completed_at
order by b.board_number desc;

grant select on board_progress to anon, authenticated;
