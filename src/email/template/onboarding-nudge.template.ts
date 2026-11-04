export function onboardingNudgeTemplate(
  firstName: string,
  outstandingSteps: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Complete your onboarding</title>
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
                    <h2 style="margin: 0 0 12px; color: #212121; font-size: 20px;">Complete your onboarding</h2>
                    <p style="margin: 0 0 12px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Hello ${firstName}, this is a friendly reminder to complete your onboarding.
                    </p>
                    <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Outstanding steps: <strong>${outstandingSteps}</strong>
                    </p>
                    <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                      Please log in to your account to finish onboarding.
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
