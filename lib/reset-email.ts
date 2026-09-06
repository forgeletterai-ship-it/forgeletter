/**
 * Branded password-reset email, HTML + plain text. Mirrors the visual
 * language of lib/launch-email.ts (logo, cream background, white
 * card, serif headline, gold rule, teal button) so every ForgeLetter
 * email looks like the same product. Dependency-free on purpose so
 * offline scripts can import it directly.
 */
export function buildResetEmail(
  siteUrl: string,
  resetUrl: string
): { subject: string; text: string; html: string } {
  const subject = "Reset your ForgeLetter password"

  const text = [
    "Reset your password.",
    "",
    "We received a request to reset the password for your ForgeLetter account. Use this secure link to choose a new one:",
    "",
    resetUrl,
    "",
    "The link is valid for 45 minutes and can be used once.",
    "",
    "If you did not request this, you can safely ignore this email. Your password stays unchanged.",
    "",
    "The ForgeLetter team",
  ].join("\n")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f4ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f4ee;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

          <tr>
            <td align="center" style="padding:0 0 26px;">
              <img src="${siteUrl}/letterforge-logo.png" width="200" alt="ForgeLetter"
                style="display:block;width:200px;height:auto;border:0;">
            </td>
          </tr>

          <tr>
            <td style="background-color:#fffdf8;border:1px solid #e5ded2;border-radius:12px;padding:44px 44px 40px;">
              <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:32px;line-height:1.15;letter-spacing:-0.5px;color:#17120f;">
                Reset your password.
              </h1>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:14px 0 22px;">
                  <div style="width:64px;height:3px;border-radius:3px;background-color:#c79a36;font-size:0;line-height:0;">&nbsp;</div>
                </td></tr>
              </table>
              <p style="margin:0 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.75;color:#514942;">
                We received a request to reset the password for your
                ForgeLetter account. Click the button below to choose a
                new one.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#246b6f;">
                    <a href="${resetUrl}" target="_blank"
                      style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Choose a new password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:30px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#6f655c;">
                The link is valid for 45 minutes and can be used once.
                If you did not request this, you can safely ignore this
                email. Your password stays unchanged.
              </p>
              <p style="margin:26px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.6;color:#17120f;">
                The ForgeLetter team
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 32px 8px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6f655c;">
                This email was sent because a password reset was requested
                for your account at
                <a href="${siteUrl}" style="color:#7a5415;text-decoration:underline;">forgeletter.com</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}
