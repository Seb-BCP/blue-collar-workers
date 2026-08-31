-- Blue Collar People Client Portal: assign one existing Auth user to one client.
--
-- 1. Create the user in Authentication > Users with their email and password.
-- 2. Replace the UUID below with the real UUID used by the workforce RPC for
--    the client organisation. Do not use a made-up UUID: it must be the ID of
--    the existing client record (for example, the ZZZ client).
-- 3. Run this script in the project SQL Editor, then have the user sign out and
--    sign back in so Supabase issues a session containing the new claim.
--
-- This stores access in server-controlled app metadata. Never use user metadata
-- for client access, and do not grant table permissions to the browser.

do $$
declare
  target_user_id uuid;
  target_client_id text := 'REPLACE_WITH_ZZZ_CLIENT_UUID';
  target_email text := 'sebastian7manuel@gmail.com';
  target_client_name text := 'ZZZ';
begin
  if target_client_id = 'REPLACE_WITH_ZZZ_CLIENT_UUID' then
    raise exception
      'Replace REPLACE_WITH_ZZZ_CLIENT_UUID with the existing ZZZ client UUID before running this script.';
  end if;

  if target_client_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'The client ID must be a UUID, not "%".', target_client_id;
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(target_email);

  if target_user_id is null then
    raise exception
      'No Auth user exists for %. Create the user in Authentication > Users first.',
      target_email;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'client_id', target_client_id,
      'client_name', target_client_name
    )
  where id = target_user_id;
end;
$$;

-- Confirm the protected metadata that determines this user's portal scope.
select
  id,
  email,
  raw_app_meta_data ->> 'client_id' as client_id,
  raw_app_meta_data ->> 'client_name' as client_name
from auth.users
where lower(email) = 'sebastian7manuel@gmail.com';
