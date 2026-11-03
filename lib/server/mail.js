import "server-only";

// Transactional email via Brevo's HTTP API (free: 300 emails/day). Sender shows as "FitMate".
// Env: BREVO_API_KEY, MAIL_FROM_EMAIL (a sender verified in Brevo), MAIL_FROM_NAME (default FitMate).
export async function sendMail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.MAIL_FROM_EMAIL;
  if (!apiKey || !fromEmail) throw new Error("Email isn't configured on the server.");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || "FitMate", email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Email send failed (${res.status}).`);
}

export function resetCodeEmail(code) {
  const text = `Your FitMate password reset code is ${code}. It expires in 10 minutes. If you didn't ask for this, ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td style="font-size:20px;font-weight:700;color:#111">Fit<span style="color:#059669">Mate</span></td></tr>
      <tr><td style="padding-top:20px;font-size:16px;color:#333">Use this code to reset your password:</td></tr>
      <tr><td style="padding:20px 0;font-size:36px;font-weight:700;letter-spacing:10px;color:#059669">${code}</td></tr>
      <tr><td style="font-size:14px;color:#666">It expires in 10 minutes. If you didn't ask to reset your password, you can ignore this email.</td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject: `${code} is your FitMate reset code`, html, text };
}
