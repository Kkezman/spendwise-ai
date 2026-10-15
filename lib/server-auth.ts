import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { logAuthError } from "@/lib/auth-errors";

export async function getAuthenticatedClient() {
  const supabase = createClient(await cookies());
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    logAuthError("get_user", error);
  }

  return { supabase, user };
}
