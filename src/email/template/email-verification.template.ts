export function emailVerificationTemplate(
  email: string,
  verifyLink: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Confirm Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
                <tr>
                  <td style="background-color: #1e88e5; padding: 28px 32px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Foundation HR</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 12px; color: #212121; font-size: 20px;">Confirm your email address</h2>
                    <p style="margin: 0 0 8px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Hi ${email},
                    </p>
                    <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Welcome to Foundation HR. Click the button below to confirm your email address. This link expires in 24 hours.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${verifyLink}" style="display: inline-block; background-color: #1e88e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 8px;">Confirm Email</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.6;">
                      If the button does not work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 24px; color: #2563eb; font-size: 13px; line-height: 1.6; word-break: break-all;">${verifyLink}</p>
                    <p style="margin: 0 0 24px; color: #64748b; font-size: 13px; line-height: 1.6;">
                      If you did not sign up for Foundation HR, you can safely ignore this email.
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                      © 2026 Foundation HR. All rights reserved. Sent to ${email}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
