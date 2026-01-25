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
  <title>Potwierdź rejestrację</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #0a0a0a; color: #ededed; margin: 0; padding: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Logo / Header -->
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: bold; color: #ededed; margin-bottom: 30px; letter-spacing: 1px; text-transform: uppercase;">
          Rekwizytor
        </div>

        <!-- Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #171717; border-radius: 0px; border: 1px solid #333333; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h2 style="font-family: 'Courier New', Courier, monospace; color: #ededed; margin-top: 0; margin-bottom: 20px; font-size: 24px;">Potwierdź rejestrację</h2>
              
              <p style="font-family: Arial, Helvetica, sans-serif; color: #a1a1aa; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                Kliknij w poniższy przycisk, aby potwierdzić swój adres e-mail.
                <br><br>
                <strong style="color: #eab308;">Ważne:</strong> Po potwierdzeniu maila, Twoje konto trafi do <strong>kolejki oczekujących</strong>. Dostęp do aplikacji uzyskasz dopiero po zatwierdzeniu konta przez administratora.
              </p>

              <!-- Button -->
              <a href="{{ .ConfirmationURL }}" style="font-family: 'Courier New', Courier, monospace; display: inline-block; background-color: #A0232F; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 4px; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                Potwierdź e-mail
              </a>

              <p style="font-family: Arial, Helvetica, sans-serif; margin-top: 30px; font-size: 13px; color: #52525b;">
                Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div style="font-family: Arial, Helvetica, sans-serif; margin-top: 30px; color: #52525b; font-size: 12px;">
          &copy; 2025 Rekwizytor. Wszelkie prawa zastrzeżone.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
```
