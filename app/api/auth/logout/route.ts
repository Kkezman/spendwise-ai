import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { logAuthError } from "@/lib/auth-errors";
import { RECOVERY_COOKIE_NAME } from "@/lib/recovery-session";

export async function POST() {
  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signOut();

  if (error) {
    logAuthError("logout", error);
    return NextResponse.json({ message: "Unable to sign out. Please try again." }, { status: 500 });
  }

  (await cookies()).delete(RECOVERY_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
