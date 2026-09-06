/**
 * The one-time launch announcement email, in both HTML and plain-text
 * form. Kept dependency-free so offline scripts can import it
 * directly; lib/launch-notify.ts is the production consumer.
 *
 * Email HTML rules apply: table layout, inline styles only, absolute
 * image URLs, email-safe fonts (Georgia for the display serif matches
 * the site's headline face).
 */
export function buildLaunchEmail(
  siteUrl: string,
  opts?: { test?: boolean }
): { subject: string; text: string; html: string } {
  const subject = opts?.test ? "[Test] ForgeLetter is live" : "ForgeLetter is live"

  const text = [
    "The doors are open.",
    "",
    "ForgeLetter is officially live. Every cover letter is written, checked and refined by a pipeline of up to 12 specialized, trained AI agents before you see it, so what you send is specific, sharp and yours.",
    "",
    "You asked to be the first to know. This is your moment:",
    "",
    siteUrl,
    "",
    "Create your account, generate your first letter in minutes, and tell us what you think. Early feedback directly shapes what we build next.",
    "",
    "The ForgeLetter team",
    "",
    "You are receiving this one-time email because you asked to be notified about the ForgeLetter launch. This list will never send another message.",
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
                The doors are open.
              </h1>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:14px 0 22px;">
                  <div style="width:64px;height:3px;border-radius:3px;background-color:#c79a36;font-size:0;line-height:0;">&nbsp;</div>
                </td></tr>
              </table>
              <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.75;color:#514942;">
                ForgeLetter is officially live. Every cover letter is written,
                checked and refined by a pipeline of up to 12 specialized,
                trained AI agents before you see it, so what you send is
                specific, sharp and yours.
              </p>
              <p style="margin:0 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.75;color:#514942;">
                You asked to be the first to know. This is your moment.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#246b6f;">
                    <a href="${siteUrl}" target="_blank"
                      style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Create your account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:30px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.75;color:#514942;">
                Generate your first letter in minutes and tell us what you
                think. Early feedback directly shapes what we build next.
              </p>
              <p style="margin:26px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.6;color:#17120f;">
                The ForgeLetter team
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 32px 8px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6f655c;">
                You are receiving this one-time email because you asked to be
                notified about the ForgeLetter launch. This list will never
                send another message.
              </p>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6f655c;">
                <a href="${siteUrl}" style="color:#7a5415;text-decoration:underline;">forgeletter.com</a>
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
