export function employeeInviteTemplate(
  firstName: string,
  inviteLink: string,
  orgName = 'your organisation',
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>You've been invited</title>
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
                    <h2 style="margin: 0 0 12px; color: #212121; font-size: 20px;">You're invited to join ${orgName}</h2>
                    <p style="margin: 0 0 8px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Hi ${firstName},
                    </p>
                    <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                      You've been added as an employee. Click the button below to set up your account and start onboarding.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${inviteLink}" style="display: inline-block; background-color: #1e88e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 8px;">Accept Invite</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.6;">
                      If the button does not work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 24px; color: #2563eb; font-size: 13px; line-height: 1.6; word-break: break-all;">${inviteLink}</p>
                    <p style="margin: 0 0 24px; color: #64748b; font-size: 13px; line-height: 1.6;">
                      If you were not expecting this invitation, you can safely ignore this email.
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                      © 2026 Foundation HR. All rights reserved.
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
