# Email System

NIMASREPUB sends application emails through Resend. The app now uses Resend for:

- welcome/onboarding email after a user confirms their account and reaches `/auth/callback`
- author submission confirmation
- editorial new-submission alert
- editorial decision email

Required app environment variables:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@nimasrepub.com.ng
EDITORIAL_EMAIL=editorial@nimasrepub.com.ng
NEXT_PUBLIC_SITE_URL=https://nimasrepub.com.ng
```

## Supabase Auth Email

Supabase still controls the first account-confirmation, password-recovery, magic-link, and invite emails. To make those come from the journal's Resend sender instead of Supabase's default sender, configure custom SMTP in Supabase:

1. Open the Supabase project dashboard.
2. Go to `Authentication` -> `Emails` or `Authentication` -> `Settings` -> `SMTP`, depending on the dashboard version.
3. Enable custom SMTP.
4. Use these Resend SMTP settings:
   - Host: `smtp.resend.com`
   - Port: `465` with TLS, or `587` with STARTTLS
   - Username: `resend`
   - Password: the Resend API key
   - Sender email: `no-reply@nimasrepub.com.ng`
   - Sender name: `NIMASREPUB`
5. Update the Supabase email templates to match the journal voice and design.
   Keep the confirmation/recovery button pointed at Supabase's built-in
   confirmation URL variable, usually:

```text
{{ .ConfirmationURL }}
```

The app signup flow already sets `emailRedirectTo` to
`https://nimasrepub.com.ng/auth/callback`, so after Supabase verifies the
token it redirects back into the app, creates the session, and sends the
one-time onboarding email.

## Troubleshooting Signup Email Errors

If signup returns an empty-looking error such as `{}`, Supabase Auth usually
failed while trying to send the confirmation email through custom SMTP. Check:

- The Resend domain for `nimasrepub.com.ng` is verified.
- The Supabase sender email matches a verified Resend sender, for example
  `no-reply@nimasrepub.com.ng`.
- The SMTP username is exactly `resend`.
- The SMTP password is the Resend API key, not the Resend login password.
- Port/security pairing is correct: `465` with TLS, or `587` with STARTTLS.
- Supabase Auth `Site URL` is `https://nimasrepub.com.ng`.
- Supabase redirect URLs include:

```text
https://nimasrepub.com.ng/auth/callback
http://localhost:3000/auth/callback
```

## Onboarding Email Tracking

Migration `0013_profile_onboarding_email.sql` adds `profiles.welcome_email_sent_at`. The auth callback sends the onboarding email once, then stores the timestamp so repeat logins do not resend the welcome email.
