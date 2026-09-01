-- Blue Collar People Client Portal: exclude inactive worker profiles.
--
-- Run this once in the Supabase SQL Editor for the portal's project. It keeps
-- the existing protected RPC contract and adds only the worker-profile active
-- predicate. No is_active field is returned to the client.

drop function if exists public.get_client_worker_calendar();

create or replace function public.get_client_worker_calendar()
returns table (
  worker_name text,
  classification text,
  phone text,
  photo_bucket text,
  photo_path text,
  photo_mime_type text,
  photo_updated_at timestamptz,
  work_date date,
  assignment_day_is_active boolean,
  start_date date,
  end_date date,
  end_date_confirmed boolean,
  ongoing_assignment boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin

  -- Must be authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Must explicitly have client portal access
  if coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'portal_access')::boolean,
    false
  ) is not true then
    raise exception 'Portal access not enabled';
  end if;

  -- Must be linked to an existing Work-Force client
  if auth.jwt() -> 'app_metadata' ->> 'client_id' is null then
    raise exception 'No client assigned';
  end if;

  return query

  select distinct
    wi.worker as worker_name,
    classification.name as classification,
    wp.phone,
    wp.profile_photo_bucket as photo_bucket,
    wp.profile_photo_path as photo_path,
    wp.profile_photo_mime_type as photo_mime_type,
    wp.profile_photo_updated_at as photo_updated_at,
    ad.work_date,
    ad.is_active as assignment_day_is_active,
    a.start_date,
    a.end_date,
    coalesce(a.end_date_confirmed, false) as end_date_confirmed,
    coalesce(a.ongoing_assignment, false) as ongoing_assignment

  from public.orders o

  join public.assignments a
    on a.order_id = o.id

  left join public.classifications classification
    on classification.id = a.classification_id

  join public.worker_profiles wp
    on wp.id = a.worker_profile_id

  join public.worker_ids wi
    on wi.id = wp.worker_ids_id

  left join public.assignment_days ad
    on ad.assignment_id = a.id

  where
    o.client_id =
      (auth.jwt() -> 'app_metadata' ->> 'client_id')::uuid
    and o.is_active = true
    and a.is_active = true
    and wp.is_active = true

  order by
    wi.worker,
    a.start_date,
    ad.work_date;

end;
$$;

-- Keep the RPC callable only by authenticated users.
revoke all
on function public.get_client_worker_calendar()
from public;

revoke all
on function public.get_client_worker_calendar()
from anon;

grant execute
on function public.get_client_worker_calendar()
to authenticated;
