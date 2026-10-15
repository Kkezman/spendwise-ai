import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import {
  isValidRecoverySession,
  RECOVERY_COOKIE_NAME,
  RECOVERY_SESSION_TTL_SECONDS,
  refreshRecoverySessionValue,
} from "@/lib/recovery-session";

const protectedRoutes = ["/dashboard", "/insights"];
const authRoutes = ["/login", "/signup", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const recoveryCookie = request.cookies.get(RECOVERY_COOKIE_NAME)?.value;
  const recoveryInProgress =
    !!user &&
    isValidRecoverySession(user.id, recoveryCookie);
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isAuthPage = authRoutes.includes(pathname);

  const refreshedRecoveryCookie = recoveryInProgress && user
    ? refreshRecoverySessionValue(user.id, recoveryCookie)
    : undefined;

  if (refreshedRecoveryCookie) {
    response.cookies.set(RECOVERY_COOKIE_NAME, refreshedRecoveryCookie, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: RECOVERY_SESSION_TTL_SECONDS,
    });
  }

  if (recoveryInProgress && pathname !== "/reset-password") {
    const redirectResponse = NextResponse.redirect(new URL("/reset-password", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (pathname === "/") {
    const redirectResponse = NextResponse.redirect(new URL(user ? "/dashboard" : "/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (isProtected && !user) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (isAuthPage && user) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/dashboard/:path*", "/insights/:path*"],
};
