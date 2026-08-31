# Blue Collar People Client Portal

A read-only Next.js client portal backed by the existing Work-Force Supabase
project. It does not create or use a separate workforce data store.

## What the portal reads

The portal calls only `public.get_client_worker_calendar()` for client-visible
workforce information. It calls the function with no frontend-provided
parameters; the function determines the authorised client from the signed-in
user's `app_metadata.client_id` claim.

Only these fields are transformed for the interface:

- worker name
- phone
- private photo metadata used server-side to make a short-lived URL
- assigned work dates

No page queries `worker_profiles`, `worker_ids`, `assignments`, `orders`, or
`assignment_days`.

## Local setup

1. Copy `.env.example` to `.env.local` and add the existing Supabase project's
   URL and anon/publishable key.
2. In Supabase Auth, add `http://localhost:3000/auth/callback` and the deployed
   `https://your-domain/auth/callback` to the redirect allow list.
3. Start the portal with `npm run dev`.

The magic-link flow has `shouldCreateUser: false`; client users must be
pre-provisioned and have a valid client UUID in protected Auth `app_metadata`.

## Required Supabase checks before launch

- Confirm `get_client_worker_calendar()` accepts no `client_id`, derives scope
  from the JWT, returns only its documented fields, and is executable by
  `authenticated` but not `anon`.
- Confirm direct browser access to internal tables is denied by RLS for client
  accounts. The portal UI alone cannot secure the shared project.
- Keep `worker-documents` private. Its Storage RLS must permit an authenticated
  client to create a signed URL only for photos from their authorised RPC
  result. The app uses the user's session and never a service-role key.
- Test two client accounts against the RPC and private Storage to confirm neither
  can access the other's data or photos.

## Operational note

V1 loads the RPC response once and filters weeks in the browser. That is
appropriate only when the function returns a reasonably small history. If it
returns a large historical dataset, stop and introduce a bounded, authorised
backend RPC design rather than adding frontend filtering or a client-controlled
`client_id`.
