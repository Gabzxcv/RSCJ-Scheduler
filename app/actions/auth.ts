"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=Enter%20your%20email%20and%20password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("Email or password is incorrect")}`);
  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");
  if (password.length < 8) {
    redirect(`/set-password?error=${encodeURIComponent("Use a password with at least 8 characters.")}`);
  }
  if (password !== confirmation) {
    redirect(`/set-password?error=${encodeURIComponent("The passwords do not match.")}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?error=${encodeURIComponent("Your invitation has expired. Ask the boss to send it again.")}`);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/set-password?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}
