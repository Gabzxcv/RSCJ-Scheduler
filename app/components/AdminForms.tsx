"use client";

import { useActionState } from "react";
import { inviteWorkspaceUserAction, updateSettingsAction } from "@/app/actions/records";
import type { ActionState } from "@/lib/types";
import { useFormSubmit } from "@/app/components/useFormSubmit";

const empty: ActionState = {};
const zones = ["Asia/Manila", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", "Australia/Sydney", "UTC", "Europe/London", "America/Los_Angeles", "America/New_York"];

export function SettingsForm({ businessName, timezone }: { businessName: string; timezone: string }) {
  const [state, action, pending] = useActionState(updateSettingsAction, empty);
  const { ref, onSubmit } = useFormSubmit(action);
  const zoneOptions = zones.includes(timezone) ? zones : [timezone, ...zones];
  return <form ref={ref} onSubmit={onSubmit} className="stack-form settings-form"><label>Business name<input name="business_name" defaultValue={businessName} required maxLength={80} /></label><label>Business time zone<select name="timezone" defaultValue={timezone}>{zoneOptions.map((zone) => <option value={zone} key={zone}>{zone.replaceAll("_", " ")}</option>)}</select><small>Trip times are shown in this time zone on every device.</small></label>{state.error && <div className="notice error compact-notice">{state.error}</div>}{state.success && <div className="notice success compact-notice">{state.success}</div>}<button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button></form>;
}

export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteWorkspaceUserAction, empty);
  const { ref, onSubmit } = useFormSubmit(action, state.success ? state : null);
  return <form ref={ref} onSubmit={onSubmit} className="stack-form invite-form"><label>Full name<input name="display_name" placeholder="Team member name" required /></label><label>Email address<input name="email" type="email" placeholder="name@company.com" required /></label><label>Access role<select name="role" defaultValue="secretary"><option value="secretary">Secretary · Schedule and records</option><option value="boss">Boss · Full access</option></select></label>{state.error && <div className="notice error compact-notice">{state.error}</div>}{state.success && <div className="notice success compact-notice">{state.success}</div>}<button className="button primary" type="submit" disabled={pending}>{pending ? "Sending invite…" : "Send invitation"}<span>→</span></button></form>;
}
