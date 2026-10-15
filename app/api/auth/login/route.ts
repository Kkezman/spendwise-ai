import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getLoginError, logAuthError } from "@/lib/auth-errors";

const LoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email address and password." }, { status: 400 });
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    logAuthError("login", error);
    const failure = getLoginError(error.code);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }

  return NextResponse.json({ message: "Signed in successfully." });
}
