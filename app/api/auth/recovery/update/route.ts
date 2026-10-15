import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { logAuthError } from "@/lib/auth-errors";
import {
  isValidRecoverySession,
  RECOVERY_COOKIE_NAME,
} from "@/lib/recovery-session";

const UpdatePasswordSchema = z
  .object({
    password: z.string().min(8).max(256),
    confirmPassword: z.string().min(8).max(256),
  })
  .refine((input) => input.password === input.confirmPassword);

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Enter and confirm a valid new password." }, { status: 400 });
  }

  const parsed = UpdatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Passwords must match and be at least 8 characters long." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const recoveryCookie = cookieStore.get(RECOVERY_COOKIE_NAME)?.value;

  if (userError || !user || !isValidRecoverySession(user.id, recoveryCookie)) {
    return NextResponse.json(
      { message: "This recovery session is invalid or expired. Request a new password recovery email." },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logAuthError("update_recovered_password", error);
    return NextResponse.json(
      {
        message: error.code === "weak_password"
          ? "Choose a stronger password that meets the project’s password requirements."
          : "We could not update your password. Your recovery link may have expired; request a new one and try again.",
      },
      { status: 400 },
    );
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) logAuthError("complete_password_recovery", signOutError);

  cookieStore.delete(RECOVERY_COOKIE_NAME);
  return NextResponse.json({
    message: "Your password has been updated. Sign in with your new password.",
  });
}
