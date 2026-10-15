type SupabaseAuthError = {
  code?: string;
  status?: number;
};

export function logAuthError(operation: string, error: SupabaseAuthError) {
  const code = error.code && /^[a-z0-9_]{1,64}$/i.test(error.code) ? error.code : "unknown";
  const status = Number.isInteger(error.status) ? error.status : undefined;

  console.error("Supabase Auth operation failed.", { operation, code, status });
}

export function getSignupError(code?: string) {
  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return {
        status: 429,
        message: "Too many signup or email requests. Wait a while and try again.",
      };
    case "email_address_invalid":
      return {
        status: 400,
        message: "That email address could not be accepted. Check it and try again.",
      };
    case "email_address_not_authorized":
      return {
        status: 400,
        message: "This project is not authorized to send to that address. Check Supabase email provider settings.",
      };
    case "signup_disabled":
    case "email_provider_disabled":
      return {
        status: 400,
        message: "Email signup is currently disabled for this project. Contact the project administrator.",
      };
    case "weak_password":
      return {
        status: 400,
        message: "Choose a stronger password that meets the project’s password requirements.",
      };
    default:
      return {
        status: 502,
        message: "Supabase could not complete signup. Check the project’s Auth logs and email provider settings.",
      };
  }
}

export function getLoginError(code?: string) {
  switch (code) {
    case "invalid_credentials":
    case "user_not_found":
      return {
        status: 401,
        message: "Email or password is incorrect. If you just signed up, confirm your email before signing in.",
      };
    case "email_not_confirmed":
      return {
        status: 401,
        message: "Confirm your email using the link sent to you before signing in. Check your spam folder too.",
      };
    case "over_request_rate_limit":
      return {
        status: 429,
        message: "Too many sign-in attempts. Wait a while before trying again.",
      };
    case "user_banned":
      return {
        status: 403,
        message: "This account cannot sign in right now. Contact the project administrator.",
      };
    default:
      return {
        status: 502,
        message: "Supabase could not complete sign-in. Please retry; if it continues, check the project’s Auth logs.",
      };
  }
}
