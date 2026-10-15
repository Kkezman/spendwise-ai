import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { logAuthError } from "@/lib/auth-errors";

const ForgotPasswordSchema = z.object({
  email: z.email().max(254),
});

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  const parsed = ForgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = createClient(await cookies());
  const redirectTo = new URL(
    "/auth/callback",
    process.env.NEXT_PUBLIC_SITE_URL || request.url,
  ).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  if (error) {
    logAuthError("request_password_recovery", error);
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return NextResponse.json(
        { message: "Too many requests. Wait a while before trying again." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { message: "We could not process the request right now. Check the project’s Auth and email settings, then try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    message: "If an account exists for that address, a password recovery email will be sent. Check your inbox and spam folder.",
  });
}
