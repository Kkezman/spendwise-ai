import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getSignupError, logAuthError } from "@/lib/auth-errors";

const SignupSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(256),
});

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Enter a valid email address and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: new URL(
        "/auth/callback",
        process.env.NEXT_PUBLIC_SITE_URL || request.url,
      ).toString(),
    },
  });

  if (error) {
    logAuthError("signup", error);
    const failure = getSignupError(error.code);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }

  return NextResponse.json({
    message: data.session
      ? "Account created successfully."
      : "Signup was accepted. Check your inbox and spam folder for a confirmation link. If it does not arrive, check the project’s Auth logs and email provider settings.",
    confirmationRequired: !data.session,
  });
}
