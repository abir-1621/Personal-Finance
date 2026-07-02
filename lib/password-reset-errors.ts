type PasswordResetError = {
  code?: string;
  message?: string;
  status?: number;
};

export function passwordResetErrorMessage(error: PasswordResetError, redirectTo: string) {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (error.status === 429 || code.includes("rate_limit") || message.includes("rate limit")) {
    return "Supabase email rate limit reached. Please wait a few minutes, then try again. For production, configure custom SMTP in Supabase Auth.";
  }

  if (message.includes("redirect") || message.includes("not allowed") || code.includes("redirect")) {
    return `Supabase rejected the reset redirect URL. Add ${callbackRedirectUrl(
      redirectTo
    )} to Supabase Auth > URL Configuration > Redirect URLs.`;
  }

  if (message.includes("smtp") || message.includes("email")) {
    return "Supabase could not send the reset email. Check Supabase Auth email/SMTP settings, then try again.";
  }

  return "Unable to send reset email right now. Please try again.";
}

function callbackRedirectUrl(redirectTo: string) {
  try {
    const url = new URL(redirectTo);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "your deployed /auth/callback URL";
  }
}
