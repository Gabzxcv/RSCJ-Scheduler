import { InviteUserForm } from "@/app/components/AdminForms";
import { updateWorkspaceUserAccessAction, updateWorkspaceUserRoleAction } from "@/app/actions/records";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase, user: currentUser } = await requireProfile(["boss"]);
  const query = await searchParams;
  const [{ data: profiles, error }, admin] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,role,created_at").order("created_at"),
    Promise.resolve(createAdminClient()),
  ]);
  if (error) throw new Error(error.message);
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (authError) throw new Error(authError.message);
  const authUsers = new Map(authData.users.map((account) => [account.id, account]));
  return <>
    <div className="page-heading"><div><p className="eyebrow">PEOPLE WITH ACCESS</p><h1>Team access</h1><p className="muted">Invite the secretary, manage roles, and suspend access when needed.</p></div></div>
    {query.error && <div className="notice error">{query.error}</div>}{query.updated && <div className="notice success">Team access updated.</div>}
    <section className="record-layout admin-users-layout"><div className="panel record-table-panel"><div className="panel-heading"><div><p className="eyebrow">TEAM DIRECTORY</p><h2>{profiles?.length ?? 0} {profiles?.length === 1 ? "account" : "accounts"}</h2></div><span className="count-pill">Boss only</span></div><div className="responsive-table"><table><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>INVITATION</th><th>ACCESS</th><th>UPDATE</th></tr></thead><tbody>{(profiles ?? []).map((profile: { id: string; email: string; display_name: string; role: string; created_at: string }) => {
      const account = authUsers.get(profile.id);
      const suspended = Boolean(account?.banned_until && new Date(account.banned_until).getTime() > Date.now());
      const pending = !account?.email_confirmed_at && Boolean(account?.invited_at);
      const self = currentUser.id === profile.id;
      return <tr key={profile.id}><td><div className="table-person"><span className="avatar">{profile.display_name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase() || profile.email[0].toUpperCase()}</span><div><b>{profile.display_name || "Team member"}{self && <small className="you-pill">YOU</small>}</b><small>{profile.email}</small></div></div></td><td><span className={`role-pill ${profile.role}`}>{profile.role === "boss" ? "Boss" : "Secretary"}</span></td><td>{pending ? <span className="status-badge scheduled">Invite pending</span> : account?.last_sign_in_at ? <span className="status-badge confirmed">Signed in</span> : <span className="status-badge scheduled">Not signed in</span>}</td><td><span className={`status-badge ${suspended ? "cancelled" : "confirmed"}`}>{suspended ? "Suspended" : "Active"}</span></td><td>{self ? <span className="muted">Current account</span> : <div className="user-manage-stack"><form action={updateWorkspaceUserRoleAction} className="inline-manage"><input type="hidden" name="user_id" value={profile.id} /><select name="role" defaultValue={profile.role} aria-label={`Set ${profile.display_name} role`}><option value="boss">Boss</option><option value="secretary">Secretary</option></select><button className="icon-button" title="Save role" aria-label="Save role">✓</button></form><form action={updateWorkspaceUserAccessAction} className="inline-manage"><input type="hidden" name="user_id" value={profile.id} /><input type="hidden" name="access" value={suspended ? "active" : "suspended"} /><button className={`text-button ${suspended ? "restore" : "suspend"}`}>{suspended ? "Restore access" : "Suspend"}</button></form></div>}</td></tr>;
    })}</tbody></table></div>{(profiles ?? []).length === 0 && <div className="empty-state small-empty"><h3>No team profiles yet</h3><p>Check the setup guide to link the first boss account.</p></div>}</div>
      <aside className="panel mini-form-panel"><p className="eyebrow">ADD A TEAM MEMBER</p><h2>Invite someone</h2><p className="muted">They’ll receive an email to set up their sign-in. Set the Supabase project’s Site URL and redirect allow-list first.</p><InviteUserForm /></aside></section>
  </>;
}
