# Deployment and database setup

## 1. Configure Supabase

Create a Supabase project, then run `supabase/migrations/001_initial_schema.sql` followed by `supabase/migrations/002_invoices.sql` in the SQL Editor. The first migration creates the user profiles, driver and vehicle records, trip assignments, time-off records, settings, role policies, and trip save function. The second adds invoice storage and workspace access policies. For an existing project that already has migration 001, run only migration 002.

Disable public sign-ups in Supabase Auth settings. Create the first user in **Authentication → Users**, then create its boss profile from the SQL Editor:

```sql
insert into public.profiles(id, email, display_name, role)
select id, email, 'Boss name', 'boss'
from auth.users
where email = 'boss@your-company.com'
on conflict (id) do update set role = 'boss', display_name = excluded.display_name;
```

The app does not provide public sign-up. The database trigger grants workspace profiles only to invited or explicitly provisioned users. The boss invites the secretary in the Team access screen. Configure the Supabase Site URL and allowed redirect URLs before sending invitations. The invitation link must pass through the app's server-side confirmation route so the session is written to a secure cookie.

To load the example data, run `supabase/seed.sql` after the first boss profile exists. It is optional and safe to omit. Do not use its placeholder passengers, contacts, or plate numbers for live dispatch.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local work. In Vercel, enter the same values in **Project → Settings → Environment Variables**.

- `NEXT_PUBLIC_SUPABASE_URL`: project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public client key. Row-level security protects the database.
- `SUPABASE_SERVICE_ROLE_KEY`: secret key for boss account invitations and role/access changes. Use the current Supabase `sb_secret_...` key or the legacy `service_role` key. Keep it server-only and rotate it if exposed.
- `CRON_SECRET`: long random server-only value used to authorize Vercel's daily reminder job. Optional reminders are in-app, not email or push notifications.

Do not commit `.env.local`, database passwords, or service-role keys. `.gitignore` excludes environment files.

## 3. Deploy

Push the code to a private Git repository and import it in Vercel. Vercel detects Next.js automatically. Set all four variables for Production and Preview, then deploy. Set the Supabase Auth Site URL to the production domain and add the production domain and `http://localhost:3000/**` to the redirect allow-list.

In Supabase **Authentication → Email Templates → Invite user**, use this link for the invitation button:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a>
```

The route verifies the invite and sends the new user to `/set-password`. Set the Site URL to the production app address before sending invitations, and configure custom SMTP for reliable delivery.

The app uses dynamic, authenticated server rendering. User and trip data are fetched through the signed-in Supabase session, with authorization enforced again by database policies and the trip save function. `vercel.json` runs the reminder job at 23:00 UTC (7:00 a.m. in Manila); the user preference is controlled in Notifications.

## 4. Performance and diagnosis

The workspace, schedule, trip, and invoice pages contain signed-in or frequently changing business data, so they stay dynamically rendered. Do not add shared ISR or persistent response caching to these routes: it can serve stale schedule information or mix user-specific data. Next.js and Vercel already serve static assets from the CDN. The server reuses the authenticated profile lookup and settings row during a request, and trip queries fetch the vehicle, assigned drivers, and creator/editor details in the same database request.

### Measure the deployed site

1. In the Vercel project, open **Speed Insights** and select **Enable**. The `@vercel/speed-insights` component is included in the app; deploy once after enabling it, then review Core Web Vitals after real users visit.
2. In **Observability → Functions**, sort by duration and inspect the slow routes and their logs. The default region for new Vercel projects is `iad1` (Washington, D.C.). Check the Supabase project's configured database region, then set **Project → Settings → Functions → Function Regions** to the same region or the nearest available one. This repository does not hard-code a region because the Supabase deployment region must be checked first.
3. With Vercel CLI 48.9.0 or later and `httpstat` installed, measure a route from the repository root:

   ```bash
   vercel httpstat /login
   vercel httpstat /schedule
   ```

   Compare DNS, connection, TLS, server processing, and transfer times. The protected `/schedule` route may redirect to login without an app session; use its timing as a rough request measurement, and use Observability for authenticated production requests.
4. Review recent server function logs when a route is slow:

   ```bash
   vercel logs --environment production --source serverless --since 1h --expand
   ```

### Inspect client bundles

Run `npm run analyze` with Next.js 16.1 or newer to open the built-in Turbopack bundle analyzer. Inspect the client import graph, then remove or defer a large package only when the report shows it is contributing to the initial route bundle. Next.js already splits code by route and tree-shakes unused exports.

This app has no public catalog or landing pages that can benefit from SSG/ISR today. If public, non-personalized pages are added later, they can be statically generated while keeping the signed-in workspace dynamic.

### Security headers, install icon, and CI

`next.config.ts` sends standard security headers (HSTS, frame, content-type, referrer, and permissions policies). The home-screen icon, manifest, and offline page live in `app/` and `public/`. The included GitHub Actions workflow (`.github/workflows/ci.yml`) runs type checks, lint, tests, and a build on every push; it uses placeholder Supabase values and needs no secrets.

## 5. Backups and recovery

Enable the database backup or point-in-time recovery option available for the selected Supabase plan. Before applying schema changes, make a database dump with the Supabase CLI and store it in a protected location outside this repository. For example, after installing and linking the CLI to the project:

```bash
mkdir -p backups
npx supabase db dump --linked -f backups/pre-change.sql
```

Treat dumps as sensitive business data. Restrict access, encrypt at rest, and periodically rehearse restoration to a separate test project. Supabase managed backups and point-in-time recovery availability vary by plan; confirm the retention window in the project's dashboard.

## 6. First-use checklist

1. Sign in as boss.
2. Open Settings and confirm the business name and time zone.
3. Add active drivers and their license / emergency contact details.
4. Add vehicles, capacities, and service status.
5. Invite the secretary and verify they can accept the email, set a password, and sign in.
6. Create a test trip and verify the assignment, conflict warning, edit history, CSV export, and printed schedule.
7. Run `supabase/migrations/002_invoices.sql` in the production project before using invoices. Do not rerun migration 001 if it has already been applied.
8. Remove the sample rows and add real records.
