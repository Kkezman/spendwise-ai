import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { logAuthError } from "@/lib/auth-errors";
import {
  createRecoverySessionValue,
  RECOVERY_COOKIE_NAME,
  RECOVERY_SESSION_TTL_SECONDS,
} from "@/lib/recovery-session";

function callbackRedirect(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const tokenType = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const recoveryError = tokenType === "recovery" || request.nextUrl.searchParams.has("error_code");
  let recovery = false;
  let userId: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuthError("auth_callback_code_exchange", error);
      cookieStore.delete(RECOVERY_COOKIE_NAME);
      return callbackRedirect(request, recoveryError ? "/login?error=recovery" : "/login?error=confirmation");
    }
    recovery = "redirectType" in data && data.redirectType === "recovery";
    userId = data.user?.id;
  } else if (tokenHash && (tokenType === "recovery" || tokenType === "signup" || tokenType === "email")) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType,
    });
    if (error) {
      logAuthError("auth_callback_token_verification", error);
      cookieStore.delete(RECOVERY_COOKIE_NAME);
      return callbackRedirect(request, tokenType === "recovery" ? "/login?error=recovery" : "/login?error=confirmation");
    }
    recovery = tokenType === "recovery";
    userId = data.user?.id;
  } else {
    console.error("Supabase Auth callback did not contain a supported authorization code or token hash.");
    cookieStore.delete(RECOVERY_COOKIE_NAME);
    return callbackRedirect(request, recoveryError ? "/login?error=recovery" : "/login?error=confirmation");
  }

  if (recovery) {
    if (!userId) {
      cookieStore.delete(RECOVERY_COOKIE_NAME);
      return callbackRedirect(request, "/login?error=recovery");
    }

    let recoveryValue: string;
    try {
      recoveryValue = createRecoverySessionValue(userId);
    } catch {
      console.error("Password recovery is unavailable because its server secret is not configured.");
      await supabase.auth.signOut();
      return callbackRedirect(request, "/login?error=recovery");
    }

    cookieStore.set(RECOVERY_COOKIE_NAME, recoveryValue, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: RECOVERY_SESSION_TTL_SECONDS,
    });
    return callbackRedirect(request, "/reset-password");
  }

  return callbackRedirect(request, "/dashboard");
}
