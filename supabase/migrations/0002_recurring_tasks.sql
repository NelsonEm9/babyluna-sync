-- BabyLuna Sync — recurrence-based task model
-- Replaces fixed-clock-time daily task generation with a rolling model:
-- one open (non-done) occurrence per active template at all times, rolled
-- forward the instant it's marked done. See plan:
-- babyluna-sync-app-the-snug-starlight.md for the full rationale.

create type task_recurrence_type as enum ('interval', 'weekly');

-- ── task_templates: recurrence instead of a fixed clock time ────────────
alter table task_templates add column recurrence_type task_recurrence_type;
alter table task_templates add column interval_hours smallint;
alter table task_templates add column weekly_days smallint[];

update task_templates set recurrence_type = 'interval', interval_hours = 24;

alter table task_templates alter column recurrence_type set not null;
alter table task_templates add constraint task_templates_recurrence_shape check (
  (recurrence_type = 'interval' and interval_hours is not null and weekly_days is null)
  or
  (recurrence_type = 'weekly' and weekly_days is not null and interval_hours is null
   and weekly_days <@ array[1,2,3,4,5,6,7]::smallint[])
);

alter table task_templates drop column default_time;

-- ── tasks: due_at instant instead of date + due_time ─────────────────────
alter table tasks add column due_at timestamptz;
alter table tasks add column recurrence_type task_recurrence_type;

update tasks t
set due_at = (t.date + t.due_time) at time zone h.timezone,
    recurrence_type = 'interval'
from households h
where h.id = t.household_id;

alter table tasks alter column due_at set not null;
alter table tasks alter column recurrence_type set not null;

alter table tasks drop constraint tasks_household_id_template_id_date_key;
drop index if exists tasks_household_date_idx;
alter table tasks drop column date;
alter table tasks drop column due_time;

create index tasks_household_due_idx on tasks (household_id, due_at);

-- At most one open (non-done) occurrence per template at a time. NULLs are
-- distinct in a unique index, so this never blocks a hypothetical one-off
-- task (template_id null).
create unique index tasks_open_occurrence_idx on tasks (template_id) where status <> 'done';

-- ── Helper: next date on/after a given date matching one of these ISO
-- weekdays (1=Mon..7=Sun). Internal only — not a PostgREST RPC endpoint.
create function next_scheduled_weekday(p_after date, p_days smallint[], p_include_today boolean default false)
returns date
language sql
immutable
set search_path = public
as $$
  select p_after + offset_days
  from generate_series(case when p_include_today then 0 else 1 end, 7) as offset_days
  where extract(isodow from p_after + offset_days)::smallint = any(p_days)
  order by offset_days
  limit 1;
$$;
revoke execute on function next_scheduled_weekday(date, smallint[], boolean) from public, anon, authenticated;

-- ── Daily-generation functions are gone; replaced by roll-forward-on-log
-- (implemented in the app's updateTaskStatus action) plus this safety net.
select cron.unschedule('babyluna-daily-reset');
drop function run_scheduled_resets();
drop function generate_daily_tasks(uuid, date);

-- Inserts the missing open occurrence for any active template that doesn't
-- have one. Idempotent and safe to run for any household at any time — no
-- "is it near reset_time" timing check needed, unlike the function this
-- replaces.
create function sweep_missing_occurrences()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into tasks (household_id, template_id, category, name, recurrence_type, due_at)
  select
    t.household_id,
    t.id,
    t.category,
    t.name,
    t.recurrence_type,
    case
      when t.recurrence_type = 'interval' then now()
      else (next_scheduled_weekday(current_date, t.weekly_days, true) + h.reset_time) at time zone h.timezone
    end
  from task_templates t
  join households h on h.id = t.household_id
  where t.is_active
    and not exists (
      select 1 from tasks x where x.template_id = t.id and x.status <> 'done'
    );
end;
$$;
revoke execute on function sweep_missing_occurrences() from public, anon, authenticated;

-- User-facing "Sync tasks": same backfill, scoped to the caller's own
-- household(s) via RLS (my_household_ids()) rather than a caller-supplied
-- household id, which would be a cross-household leak risk under
-- SECURITY DEFINER. SECURITY INVOKER + no arguments closes that off.
create function resync_household_tasks()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into tasks (household_id, template_id, category, name, recurrence_type, due_at)
  select
    t.household_id,
    t.id,
    t.category,
    t.name,
    t.recurrence_type,
    case
      when t.recurrence_type = 'interval' then now()
      else (next_scheduled_weekday(current_date, t.weekly_days, true) + h.reset_time) at time zone h.timezone
    end
  from task_templates t
  join households h on h.id = t.household_id
  where t.is_active
    and t.household_id in (select my_household_ids())
    and not exists (
      select 1 from tasks x where x.template_id = t.id and x.status <> 'done'
    );
end;
$$;
grant execute on function resync_household_tasks() to authenticated;

-- Pure backstop now (not time-critical the way the old reset-time-window
-- check was) — a longer interval is fine.
select cron.schedule('babyluna-occurrence-sweep', '*/15 * * * *', $$select sweep_missing_occurrences();$$);
