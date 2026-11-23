-- Simple visitor and sign-up counts for the Command Center. Additive only.
-- One row per anonymous browser per day (Lagos time). The visitor id is a random
-- string the browser makes for itself; no IP, email or device details are kept.
create table if not exists public.quizy_site_visits (
  day date not null,
  visitor text not null check (visitor ~ '^[A-Za-z0-9_-]{8,64}$'),
  views integer not null default 1,
  user_id uuid references auth.users(id) on delete set null,
  first_at timestamptz not null default now(),
  primary key (day, visitor)
);
create index if not exists quizy_site_visits_user_idx on public.quizy_site_visits (user_id) where user_id is not null;
alter table public.quizy_site_visits enable row level security;
alter table public.quizy_site_visits force row level security;
revoke all on public.quizy_site_visits from anon, authenticated;

create or replace function public.quizy_track_visit(p_visitor text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor is null or p_visitor !~ '^[A-Za-z0-9_-]{8,64}$' then return; end if;
  insert into public.quizy_site_visits (day, visitor, user_id)
  values ((now() at time zone 'Africa/Lagos')::date, p_visitor, (select auth.uid()))
  on conflict (day, visitor) do update
    set views = least(public.quizy_site_visits.views + 1, 5000),
        user_id = coalesce(excluded.user_id, public.quizy_site_visits.user_id);
end $$;
revoke all on function public.quizy_track_visit(text) from public;
grant execute on function public.quizy_track_visit(text) to anon, authenticated;

-- Accounts on this shared Supabase project that belong to Quizy: tagged at sign-up
-- from now on, or (for older accounts) with any Quizy activity.
create or replace function public.quizy_is_explorer_account(p_user uuid, p_meta jsonb)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_meta ->> 'signup_app', '') = 'quizy'
    or (coalesce(p_meta ->> 'signup_app', '') = '' and (
         exists (select 1 from public.quizy_profiles x where x.user_id = p_user)
      or exists (select 1 from public.quizy_attempts x where x.user_id = p_user)
      or exists (select 1 from public.quizy_activity x where x.user_id = p_user)
      or exists (select 1 from public.quizy_installations x where x.user_id = p_user)
      or exists (select 1 from public.quizy_site_visits x where x.user_id = p_user)));
$$;
revoke all on function public.quizy_is_explorer_account(uuid, jsonb) from public, anon, authenticated;

-- Same owner rule as the quizy-command-center function.
create or replace function public.quizy_admin_traffic()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if lower(coalesce((select auth.jwt()) ->> 'email', '')) <> 'uchep1990@gmail.com' then
    raise exception 'Command Center is for the Quizy owner.';
  end if;
  return (
    with v as (select day, count(*) as visitors, sum(views) as views from public.quizy_site_visits
               where day > today - 30 group by day),
    s as (select (u.created_at at time zone 'Africa/Lagos')::date as day, count(*) as signups
          from auth.users u
          where u.created_at > now() - interval '31 days' and public.quizy_is_explorer_account(u.id, u.raw_user_meta_data)
          group by 1),
    days as (select (today - g)::date as day from generate_series(0, 13) g)
    select json_build_object(
      'visitors_today', coalesce((select visitors from v where day = today), 0),
      'visitors_7d', (select count(distinct visitor) from public.quizy_site_visits where day > today - 7),
      'visitors_30d', (select count(distinct visitor) from public.quizy_site_visits where day > today - 30),
      'views_today', coalesce((select views from v where day = today), 0),
      'views_7d', coalesce((select sum(views) from v where day > today - 7), 0),
      'views_30d', coalesce((select sum(views) from v), 0),
      'signups_today', coalesce((select signups from s where day = today), 0),
      'signups_7d', coalesce((select sum(signups) from s where day > today - 7), 0),
      'signups_30d', coalesce((select sum(signups) from s where day > today - 30), 0),
      'signups_total', (select count(*) from auth.users u where public.quizy_is_explorer_account(u.id, u.raw_user_meta_data)),
      'weekly_players_7d', (select count(distinct user_id) from public.quizy_activity where event_type = 'weekly_challenge' and created_at > now() - interval '7 days'),
      'series', (select json_agg(json_build_object('day', d.day, 'visitors', coalesce(v.visitors, 0), 'views', coalesce(v.views, 0), 'signups', coalesce(s.signups, 0)) order by d.day)
                 from days d left join v on v.day = d.day left join s on s.day = d.day)
    )
  );
end $$;
revoke all on function public.quizy_admin_traffic() from public, anon;
grant execute on function public.quizy_admin_traffic() to authenticated;
