import { cache } from "react";
import { redirect } from "next/navigation";
import type { Profile, Role } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

// React clears this memoized result after each server request. The workspace
// layout and child page can share the same authenticated Supabase client and
// profile lookup without retaining one user's session for another request.
export const getSignedInProfile = cache(async function getSignedInProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("id,email,display_name,role").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: profile as Profile | null };
});

export async function requireProfile(roles?: Role[]) {
  const result = await getSignedInProfile();
  if (!result.user) redirect("/login");
  if (!result.profile) redirect("/login?unlinked=1");
  if (roles && !roles.includes(result.profile.role)) redirect("/");
  return { ...result, user: result.user, profile: result.profile };
}
