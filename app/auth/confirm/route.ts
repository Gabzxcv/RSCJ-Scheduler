import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  // This endpoint is used by the private workspace's invitation email template.
  // Keep the destination fixed so an email link cannot redirect to an arbitrary site.
  if (!tokenHash || type !== "invite") {
    return NextResponse.redirect(new URL("/login?error=This%20invitation%20link%20is%20invalid.", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=This%20invitation%20link%20has%20expired%20or%20was%20already%20used.", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/set-password", requestUrl.origin));
}
