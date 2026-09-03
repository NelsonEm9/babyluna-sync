-- BabyLuna Sync — initial schema
create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────
create type task_category as enum ('feeding','sleep','diapers','tummy_time','bath','medicine');
create type task_status   as enum ('done','due','overdue');

-- ── Tables ───────────────────────────────────────────────────────────────
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reset_time time not null default '00:00',
  timezone text not null default 'UTC',
  invite_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table parents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  notify_overdue boolean not null default true,
  notify_partner_logged boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now()
);

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category task_category not null,
  name text not null,
  default_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  template_id uuid references task_templates(id) on delete set null,
  category task_category not null,
  name text not null,
  date date not null,
  due_time time not null,
  status task_status not null default 'due',
  completed_by uuid references parents(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, template_id, date)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  parent_id uuid not null references parents(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index tasks_household_date_idx on tasks (household_id, date);
create index notes_task_idx on notes (task_id);
create index task_templates_household_idx on task_templates (household_id) where is_active;

-- ── Helper: households the current user belongs to ──────────────────────
-- SECURITY DEFINER is required, not a style choice: this function queries
-- `parents`, and `parents`' own RLS policy (below) calls this function to
-- decide row visibility. Under SECURITY INVOKER that inner query would
-- re-trigger the same policy, which calls the function again — infinite
-- recursion (Postgres reports it as a bogus "violates row-level security
-- policy" error on an empty table, and a literal "stack depth limit
-- exceeded" once real rows exist). SECURITY DEFINER runs the inner query as
-- the function owner, bypassing RLS, breaking the cycle.
create function my_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from parents where auth_user_id = auth.uid();
$$;
-- Every function in `public` is auto-exposed as a PostgREST RPC endpoint by
-- default; this one is an internal RLS helper only. `authenticated` keeps
-- EXECUTE since policies call it as the requesting role.
revoke execute on function my_household_ids() from public;
revoke execute on function my_household_ids() from anon;

-- ── Row Level Security ───────────────────────────────────────────────────
alter table households     enable row level security;
alter table parents        enable row level security;
alter table task_templates enable row level security;
alter table tasks          enable row level security;
alter table notes          enable row level security;

-- Every write-capable policy below uses FOR ALL rather than separate FOR
-- INSERT/FOR UPDATE policies. This project's Postgres has a reproducible
-- quirk where standalone FOR INSERT/FOR UPDATE policies are silently not
-- applied to the authenticated/anon roles (confirmed against isolated test
-- tables — a trivial `with check (true)` FOR INSERT policy denied every
-- insert, while the identical condition under FOR ALL worked every time;
-- FOR SELECT alone was unaffected). FOR ALL is the verified-working form.

create policy "households: members read/update, anyone authenticated can create" on households
  for all to authenticated
  using (id in (select my_household_ids()))
  with check (true);

create policy "parents: members read roster, self create/update" on parents
  for all to authenticated
  using (household_id in (select my_household_ids()))
  with check (auth_user_id = auth.uid());

create policy "templates: members full access" on task_templates
  for all to authenticated
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy "tasks: members full access" on tasks
  for all to authenticated
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy "notes: members can read" on notes
  for select using (
    task_id in (select id from tasks where household_id in (select my_household_ids()))
  );
-- using (false): this FOR ALL grants nothing extra for select/update/delete
-- (notes stay immutable once posted) — it exists purely to carry a working
-- insert check, per the FOR INSERT quirk noted above.
create policy "notes: members can insert own notes" on notes
  for all to authenticated
  using (false)
  with check (
    parent_id in (select id from parents where auth_user_id = auth.uid())
    and task_id in (select id from tasks where household_id in (select my_household_ids()))
  );

-- ── Invite lookup (pre-membership, so a joiner can preview a code) ──────
create function household_by_invite_code(p_code text)
returns table (id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name from households where invite_code = p_code;
$$;
grant execute on function household_by_invite_code(text) to authenticated, anon;

-- ── Daily task generation ────────────────────────────────────────────────
create function generate_daily_tasks(p_household_id uuid, p_date date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into tasks (household_id, template_id, category, name, date, due_time)
  select p_household_id, t.id, t.category, t.name, p_date, t.default_time
  from task_templates t
  where t.household_id = p_household_id
    and t.is_active
  on conflict (household_id, template_id, date) do nothing;
end;
$$;
grant execute on function generate_daily_tasks(uuid, date) to authenticated;

-- Runs as the cron job owner (bypasses RLS) so it can sweep every household.
create function run_scheduled_resets()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h record;
  local_now timestamptz;
  local_date date;
begin
  for h in select id, reset_time, timezone from households loop
    local_now := now() at time zone h.timezone;
    local_date := local_now::date;
    if (local_now::time >= h.reset_time and local_now::time < h.reset_time + interval '5 minutes')
       and not exists (select 1 from tasks where household_id = h.id and date = local_date)
    then
      perform generate_daily_tasks(h.id, local_date);
    end if;
  end loop;
end;
$$;
-- SECURITY DEFINER + PUBLIC's default EXECUTE grant would otherwise expose
-- this over PostgREST as /rest/v1/rpc/run_scheduled_resets to anyone. It
-- must only ever run via pg_cron (as the job owner).
revoke execute on function run_scheduled_resets() from public;
revoke execute on function run_scheduled_resets() from anon, authenticated;

-- Requires the pg_cron extension. On hosted Supabase this may need to be
-- enabled once via Dashboard → Database → Extensions before this line runs.
create extension if not exists pg_cron with schema extensions;
select cron.schedule('babyluna-daily-reset', '*/5 * * * *', $$select run_scheduled_resets();$$);

-- ── Realtime ─────────────────────────────────────────────────────────────
-- parents is included so an already-open dashboard/task tab picks up a
-- newly-joined partner's name without needing a refresh.
alter publication supabase_realtime add table tasks, notes, parents;
