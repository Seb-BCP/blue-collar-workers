-- Blue Collar People Client Portal: one-user admin preview
--
-- First create or invite sebastian@bluecollarpeople.com in
-- Authentication > Users. The portal intentionally does not self-register
-- users, so do not insert a record directly into auth.users.
--
-- This role permits a clearly labelled demo-data preview only. It does not add
-- a client_id, alter RLS, grant table access, or change the workforce RPC.

do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = 'sebastian@bluecollarpeople.com';

  if target_user_id is null then
    raise exception
      'No auth user exists for sebastian@bluecollarpeople.com. Create or invite the user in Authentication > Users, then run this script again.';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('bcp_portal_preview', true)
  where id = target_user_id;
end;
$$;

-- Confirm the server-controlled flag that the portal will read at next sign-in.
select
  id,
  email,
  raw_app_meta_data ->> 'bcp_portal_preview' as bcp_portal_preview
from auth.users
where lower(email) = 'sebastian@bluecollarpeople.com';
