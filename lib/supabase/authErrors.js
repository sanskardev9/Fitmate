// Turns Supabase Auth errors into plain sentences for the login form.
export function friendlyAuthError(error) {
  const code = error?.code ?? "";
  const msg = error?.message ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) return "Email or password is incorrect.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(msg)) return "Please confirm your email first. Check your inbox for the link.";
  if (code === "user_already_exists" || /already registered/i.test(msg)) return "An account with this email already exists. Sign in instead.";
  if (code === "weak_password" || /password should be/i.test(msg)) return "Password is too weak. Use at least 6 characters.";
  if (code === "over_email_send_rate_limit" || /rate limit/i.test(msg)) return "Too many emails sent. Please wait a few minutes and try again.";
  if (code === "validation_failed" || /invalid.*email|unable to validate email/i.test(msg)) return "Please enter a valid email address.";
  if (/fetch|network/i.test(msg)) return "Can't reach the server. Check your internet connection.";
  return msg || "Something went wrong. Please try again.";
}
