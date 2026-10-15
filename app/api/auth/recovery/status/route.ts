import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isValidRecoverySession, RECOVERY_COOKIE_NAME } from "@/lib/recovery-session";
import { logAuthError } from "@/lib/auth-errors";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) logAuthError("verify_recovery_session", error);
  const recoveryCookie = cookieStore.get(RECOVERY_COOKIE_NAME)?.value;
  const recoverySession = !error && !!user && isValidRecoverySession(user.id, recoveryCookie);

  return NextResponse.json(
    { recoverySession },
    { status: recoverySession ? 200 : 401 },
  );
}
