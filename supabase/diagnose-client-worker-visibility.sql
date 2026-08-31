-- Blue Collar People Client Portal: read-only worker visibility diagnosis.
--
-- 1. Replace target_worker_name below with the name shown in the ZZZ portal.
-- 2. Run this in the Supabase SQL Editor.
-- 3. It changes no data and does not expose any additional portal fields.

-- Confirm the LIVE RPC contains the intended filters. The checked-in SQL file
-- does not apply itself to Supabase, so this result is the source of truth.
select pg_get_functiondef(
  'public.get_client_worker_calendar()'::regprocedure
);

with params as (
  select
    lower('sebastian7manuel@gmail.com')::text as target_portal_email,
    lower('REPLACE_WITH_THE_VISIBLE_WORKER_NAME')::text as target_worker_name,
    (now() at time zone 'Australia/Perth')::date as perth_today
),
target_user as (
  select
    u.email,
    u.raw_app_meta_data ->> 'client_id' as client_id_text,
    u.raw_app_meta_data ->> 'portal_access' as portal_access
  from auth.users u
  join params p
    on lower(u.email) = p.target_portal_email
)
select
  tu.email as portal_user_email,
  c.name as client_name,
  wi.worker as worker_name,

  wp.id as worker_profile_id,
  wp.is_active as worker_profile_active,

  a.id as assignment_id,
  a.status as assignment_status,
  a.is_active as assignment_active,
  a.start_date,
  a.end_date,
  a.end_date_confirmed,
  a.ongoing_assignment,

  o.id as order_id,
  o.is_active as order_active,

  count(ad.work_date) as assignment_day_count,
  min(ad.work_date) as first_assignment_day,
  max(ad.work_date) as last_assignment_day,

  case
    when tu.portal_access is distinct from 'true' then
      'Portal access claim is missing or disabled'
    when o.is_active is not true then
      'Excluded by the order active check'
    when a.is_active is not true then
      'Excluded by the assignment active check'
    when wp.is_active is not true then
      'Excluded by the worker profile active check'
    when a.end_date is not null
      and a.end_date_confirmed is true
      and a.end_date < p.perth_today then
      'Excluded by the current-workforce confirmed-end-date check'
    when a.status in ('cancelled', 'replaced') then
      'Still returned if active: current RPC has no status filter'
    when count(ad.work_date) = 0 then
      'Still returned if active: the left join permits no assignment days'
    when max(ad.work_date) < p.perth_today then
      'Still returned if active: no current-week/day filter'
    else
      'Passes the active/current-workforce checks'
  end as diagnosis
from target_user tu
cross join params p
join public.orders o
  on o.client_id::text = tu.client_id_text
left join public.clients c
  on c.id = o.client_id
join public.assignments a
  on a.order_id = o.id
join public.worker_profiles wp
  on wp.id = a.worker_profile_id
join public.worker_ids wi
  on wi.id = wp.worker_ids_id
left join public.assignment_days ad
  on ad.assignment_id = a.id
where lower(wi.worker) = p.target_worker_name
group by
  tu.email,
  tu.portal_access,
  c.name,
  wi.worker,
  wp.id,
  wp.is_active,
  a.id,
  a.status,
  a.is_active,
  a.start_date,
  a.end_date,
  a.end_date_confirmed,
  a.ongoing_assignment,
  o.id,
  o.is_active,
  p.perth_today
order by
  a.start_date desc nulls last,
  max(ad.work_date) desc nulls last;
