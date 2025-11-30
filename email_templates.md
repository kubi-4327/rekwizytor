# Szablony E-mail dla Rekwizytora

Poniżej znajduje się kod HTML dla szablonu "Confirm your signup", stylizowany zgodnie z motywem aplikacji (Dark Mode + Burgund).

## Confirm Your Signup

Skopiuj poniższy kod i wklej go w ustawieniach Supabase Auth -> Email Templates -> Confirm Signup.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your signup</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #0a0a0a; color: #ededed; margin: 0; padding: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Logo / Header -->
        <div style="font-size: 24px; font-weight: bold; color: #ededed; margin-bottom: 30px; letter-spacing: 1px; text-transform: uppercase;">
          Rekwizytor
        </div>

        <!-- Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #171717; border-radius: 12px; border: 1px solid #333333; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h2 style="color: #ededed; margin-top: 0; margin-bottom: 20px; font-size: 24px;">Confirm your signup</h2>
              
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                Follow this link to confirm your user account.
                <br><br>
                <strong>Note:</strong> After confirming your email, your account will be placed in a <strong>pending queue</strong> until an administrator approves it. You will not be able to access the application immediately.
              </p>

              <!-- Button -->
              <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #A0232F; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Confirm your mail
              </a>

              <p style="margin-top: 30px; font-size: 13px; color: #52525b;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div style="margin-top: 30px; color: #52525b; font-size: 12px;">
          &copy; 2025 Rekwizytor. All rights reserved.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
```
