import Link from "next/link";
import { markAllNotificationsReadAction, markNotificationReadAction, updateReminderPreferenceAction } from "@/app/actions/records";
import { requireProfile } from "@/lib/auth";
import { DEFAULT_TIMEZONE, formatDate, formatTime } from "@/lib/time";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string; preference?: string }> }) {
  const { supabase, user } = await requireProfile();
  const [notifications, preferences, settings, query] = await Promise.all([
    supabase.from("notifications").select("id,trip_id,kind,title,body,created_at,read_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("notification_preferences").select("reminders_enabled").eq("user_id", user.id).maybeSingle(),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
    searchParams,
  ]);
  const rows = notifications.data ?? [];
  const unread = rows.filter((item: { read_at: string | null }) => !item.read_at).length;
  const timezone = settings.data?.timezone || DEFAULT_TIMEZONE;
  const remindersEnabled = preferences.data?.reminders_enabled ?? true;
  return <>
    <div className="page-heading"><div><p className="eyebrow">ASSIGNMENT UPDATES AND REMINDERS</p><h1>Notifications</h1><p className="muted">Stay up to date when a trip is assigned or coming up.</p></div>{unread > 0 && <form action={markAllNotificationsReadAction}><button className="button secondary" type="submit">Mark all read</button></form>}</div>
    {query.error && <div className="notice error">{query.error}</div>}{query.preference && <div className="notice success">Reminder preference saved.</div>}
    <section className="notification-layout"><div className="panel notifications-panel"><div className="panel-heading"><div><p className="eyebrow">INBOX</p><h2>{unread} unread</h2></div></div>{rows.length ? <div className="notification-list">{rows.map((item: { id: string; trip_id: string | null; kind: string; title: string; body: string; created_at: string; read_at: string | null }) => <article className={`notification-row ${item.read_at ? "read" : "unread"}`} key={item.id}><div className={`notification-icon ${item.kind}`}>{item.kind === "reminder" ? "◷" : "↔"}</div><div className="notification-copy"><div className="notification-title"><b>{item.title}</b>{!item.read_at && <i className="unread-dot" />}</div><p>{item.body}</p><small>{formatDate(item.created_at, timezone, { weekday: "short", month: "short", day: "numeric" })} · {formatTime(item.created_at, timezone)}</small>{item.trip_id && <Link href={`/trips/${item.trip_id}`}>Open trip →</Link>}</div>{!item.read_at && <form action={markNotificationReadAction}><input type="hidden" name="notification_id" value={item.id} /><button className="text-button" type="submit">Mark read</button></form>}</article>)}</div> : <div className="empty-state"><div className="empty-icon">♧</div><h3>All caught up</h3><p>Trip assignment updates and reminders will appear here.</p></div>}</div>
      <aside className="panel reminder-settings"><span className="metric-icon indigo">◷</span><h2>Upcoming trip reminders</h2><p>Get an in-app reminder for scheduled or confirmed trips within 24 hours. Reminders are added once a day and appear in your inbox.</p><form action={updateReminderPreferenceAction} className="reminder-toggle-form"><input type="hidden" name="reminders_enabled" value={remindersEnabled ? "false" : "true"} /><button className={`toggle-switch ${remindersEnabled ? "enabled" : ""}`} aria-label={`${remindersEnabled ? "Disable" : "Enable"} reminders`}><i /></button><b>{remindersEnabled ? "Reminders on" : "Reminders off"}</b></form><div className="security-divider" /><small>Assignment changes appear in the other workspace account’s Notifications and are recorded in trip history.</small></aside></section>
  </>;
}
