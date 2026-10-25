# RSCJ Scheduler

A responsive web application for a small transportation business. Boss and secretary accounts share a persistent schedule of trips, drivers, vehicles, and trip changes.

## Technology

- **Next.js 16 App Router + TypeScript** for the responsive full-stack web application.
- **Supabase Auth + PostgreSQL** for sign-in, database storage, and row-level security.
- **Vercel** for hosting the Next.js application.
- Default business time zone: **Asia/Manila**. The boss can change it in Settings.

The application expects a configured Supabase project. It does not fall back to browser-only storage, so saved trips and records remain in PostgreSQL and are available on every device.

## Included features

- Password sign-in; boss and secretary roles; boss-only team access, reports, and settings.
- Day, week, and month schedule views, with driver, vehicle, and status filters.
- Create, edit, duplicate, cancel, and complete trips; assign multiple drivers and one vehicle.
- Server-side checks prevent overlapping bookings for a driver or vehicle, including simultaneous saves; driver time-off, service status, and vehicle capacity are checked before saving too.
- Driver contacts, license and emergency-contact details, and time-off ranges.
- Vehicle plate, model, capacity, and maintenance status.
- Trip activity history with the account and timestamp for every create or edit.
- Search and filter history, export CSV, print daily/weekly/monthly schedules, and export a report.
- Optional in-app trip reminders and assignment-change notifications.
- Trip-linked invoices with unique invoice numbers, client billing details, due dates, payment status tracking, and print / save as PDF.
- Sample drivers, vehicles, and future trips for initial testing.
- Responsive layout for mobile phones, tablets, and desktop browsers, tuned for iPhone and iPad (see below).

## iPhone and iPad features

- **Add to Home Screen:** open the live site in Safari, tap Share, then **Add to Home Screen**. It opens full screen with its own icon, and shows a friendly page if the connection drops.
- Larger text and 44px touch targets on iPad, 16px inputs so Safari never zooms, safe-area spacing, sticky Save buttons, and light/dark mode that follows the device with no white flash.
- **Schedule:** Day, Week, Month, and a phone-friendly **Agenda** list. The view, date, and filters are kept in the address, so Back and refresh return to the same place. Swipe left/right to change day. The page refreshes itself when you return to the app.
- **Trips:** tap to call the client or driver, open pickup/destination in Apple or Google Maps, and share a trip summary to Messages, WhatsApp, Viber, or Mail. The trip form fills the return time, shows who is busy or on leave, and keeps what you typed if a save is rejected.
- **Invoices:** Share PDF (opens the share sheet with the PDF attached), Download PDF, Email/Text client, one-tap Mark paid, edit drafts, duplicate, and CSV export for your accountant. Put GCash or bank details in the invoice Notes; they print on the PDF.

None of these need new environment variables or database changes.

## Run locally

1. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql`, then `supabase/migrations/002_invoices.sql`, in its SQL Editor. The second migration adds invoice storage and access policies. If your existing project already has the first migration, run only `002_invoices.sql`.
2. Turn off public sign-ups in Supabase Auth settings. Create the initial boss account in **Authentication → Users**. Because manually created accounts are not invitations, add its workspace profile from the SQL Editor:

   ```sql
   insert into public.profiles(id, email, display_name, role)
   select id, email, 'Your Name', 'boss'
   from auth.users
   where email = 'boss@your-company.com'
   on conflict (id) do update set role = 'boss', display_name = excluded.display_name;
   ```

   The profile trigger creates profiles for invited users, with secretary access by default. Ordinary public sign-ups get no profile and cannot read workspace data; still keep public sign-ups disabled.
3. Copy `.env.example` to `.env.local` and add the Supabase Project URL, publishable key, and server-only secret key. Find these in the Supabase project's **Connect / API Keys** settings. The `SUPABASE_SERVICE_ROLE_KEY` variable can hold the current `sb_secret_...` key or the legacy `service_role` key. Never add it to a `NEXT_PUBLIC_` variable.
4. In Supabase **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/**` to the allowed redirect URLs.
5. Install and start the app:

   ```bash
   npm install
   npm run dev
   ```

   Visit `http://localhost:3000` and sign in with the boss account.
6. Optional: run `supabase/seed.sql` in the SQL Editor to add clearly marked sample data. Sample phone numbers and clients are placeholders; replace or remove them before real operations.
7. Set the Supabase **Authentication → Email Templates → Invite user** link to the app's `/auth/confirm` endpoint. Use this link in the template:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a>
   ```

   This sends the invitation through a server-side confirmation route, then lets the invited user choose a password at `/set-password`. Wait until deployment to invite the secretary, after changing the Supabase Site URL to the live app address. Configure custom SMTP in Supabase for reliable production email delivery.

## Deploy to Vercel

1. Push this project to a private GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the detected Next.js build settings.
3. Add these environment variables to the Vercel project for Production and Preview:

   | Variable | Value | Exposure |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Browser-safe key; database RLS still applies |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key (`sb_secret_...`) or legacy service role key | Server only; never expose to the browser |
   | `CRON_SECRET` | Long random secret for scheduled reminders | Server only; Vercel sends it to the scheduled route |

4. Deploy. In Supabase **Authentication → URL Configuration**, set the Site URL to the production Vercel domain and add `http://localhost:3000/**` plus your production app URL to the redirect allow-list. Add Vercel preview URLs only if you plan to sign in on previews. Invitation emails use the Site URL, so set it before inviting the secretary.
5. Sign in as the boss, set the business name and time zone, add real drivers and vehicles, and invite the secretary.
6. Run `supabase/migrations/002_invoices.sql` in the production Supabase project's SQL Editor before using invoices. If the project already has `001_initial_schema.sql`, do not rerun it.
7. Remove sample data before entering live operations. The sample rows are labeled and use `SAMPLE-` plates.
8. If reminders are wanted, set `CRON_SECRET` in Vercel. The included Vercel cron adds an in-app reminder at 7 a.m. Manila time for scheduled or confirmed trips departing in the next 24 hours. Each user can switch reminders on or off in Notifications.

Vercel's current Next.js deployment guide: [vercel.com/docs/frameworks/full-stack/nextjs](https://vercel.com/docs/frameworks/full-stack/nextjs).

## Database security and backups

- All application tables have PostgreSQL row-level security enabled. Only authenticated profiles with the boss or secretary role can access operational records.
- The role lookup is performed by a restricted database function. The service role key is used only in a server-side module for invitations and access changes.
- Trip writes run through a PostgreSQL function. Conflict checks and the activity-history insert happen in the same transaction. A transaction lock prevents simultaneous saves from both accepting the same conflicting assignment.
- Use the backup and point-in-time recovery options available for your Supabase plan. Before schema changes, keep a separate database dump using the Supabase CLI and store it outside the application repository. Verify that a restore is possible before relying on a backup.
- Do not use sample records for dispatching or customer contact.

## Useful scripts

```bash
npm run dev       # Local development
npm run typecheck # TypeScript checks
npm test          # Unit tests (time zones, invoice PDF)
npm run lint      # ESLint checks
npm run build     # Production build
npm run analyze   # Inspect bundles (Next.js 16.1+)
npm start         # Run the production build locally
```

For the short in-app workflow, open **Quick user guide** from the sidebar. Deployment and database setup notes are in [`docs/deployment.md`](docs/deployment.md).
