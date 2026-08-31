# Blue Collar People Client Portal

A standard Next.js application for Vercel, backed by the existing Work-Force
Supabase project. It has no Cloudflare, Wrangler, or ChatGPT hosting dependency.

## Local development preview

Run `npm install` and `npm run dev`, then open `http://localhost:3000`.

The development server intentionally opens the completed portal UI without a
login. Its data comes only from `lib/development-preview.ts`, an approved-field
fixture containing worker name, phone, photo, assigned dates, and the temporary
classification labels used to preview booking totals. It never calls Supabase
and cannot run in a production or Vercel preview deployment.

## Logo handoff

The supplied logo is stored at `public/blue-collar-people-logo.png` and is used
by both the header and login branding.

## Production configuration

Copy `.env.example` to `.env.local` and supply the existing project values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

In Supabase Auth, enable the Email provider with password sign-in. Create client
accounts in Authentication > Users and give each account its password directly;
the portal never offers public sign-up. The account must then be assigned to its
client with protected `app_metadata` as described below.

## Client access assignment

The portal authenticates existing email-and-password accounts and derives the
client scope from protected `app_metadata.client_id`. Use
[supabase/assign-client-access.sql](supabase/assign-client-access.sql) after
creating each user. Set the account email and client name in the script; it
resolves the active client's UUID server-side. Then have the user sign out and
back in so their session receives the new claim.

## One-user admin preview

`sebastian@bluecollarpeople.com` can be granted a signed-in, UI-only admin
preview with [supabase/admin-preview-access.sql](supabase/admin-preview-access.sql).
Create or invite the user in Supabase Authentication > Users first (the portal
intentionally does not self-register users), then run the SQL in the project
SQL Editor and sign out and back in to refresh the JWT. This role renders
clearly labelled demo data and never reads client workforce data.

## Production workforce security

The production portal calls only `public.get_client_worker_calendar()` with no
client-provided parameters. The RPC derives client scope from the signed-in
user's protected `app_metadata.client_id`. The browser never reads internal
workforce tables.

Production currently receives only the fields emitted by the protected
get_client_worker_calendar RPC. The interface is prepared to display an
authorised classification, plus the following worker-booking fields when that
same RPC is extended to return them:

- booking_key (opaque response key only)
- assignment_start_date
- assignment_end_date
- end_date_confirmed
- ongoing_assignment

The portal does not query assignments directly and must not infer booking days
from a start/end date. Keep the RPC client-scoped from protected
app_metadata.client_id, return no raw IDs or audit fields, and preserve its
existing assignment eligibility rules. Worker photos use short-lived URLs
created server-side from the authenticated user's session; the application
contains no service-role key.

Before launch, verify that the RPC is executable by `authenticated` but not
`anon`, direct table access is blocked by RLS, and Storage RLS allows each client
only its own returned worker photos.

## Operational note

V1 loads the RPC response once and filters the weekly view in the browser. Use
this only while the returned history stays reasonably small. If it grows large,
introduce a bounded authorised backend query instead of adding client-controlled
scope or exposing additional fields.
