# King Rhymes Music Webapp User Guide

This guide covers the public music site and the artist administration dashboard. For installation, environment variables, and deployment, see [Project Setup](SETUP.md). Payment-provider configuration is in [the Flutterwave guide](payments/FLUTTERWAVE.md).

## Public website

Use the navigation bar to visit Home, Music, About, Portfolio, Support, and Contact.

### Listen to and buy music

1. Open **Music** to browse published tracks. Search by title or genre, filter by genre, and sort by newest, rating, play count, or price.
2. Open a track to play its preview, read its details and lyrics, rate it, or join the comments.
3. Create an account or sign in to rate tracks and comment. Ratings and comments are tied to the signed-in account.
4. For a paid track, choose **Buy** and complete the hosted Flutterwave checkout. After the payment is verified, use the purchase/download link to retrieve the full track. Free tracks can be downloaded without a paid checkout.

Use a current email address at checkout so the purchase receipt and download access can be associated with you. Do not share a private download link.

### Support, bookings, and portfolio

- **Support** accepts donations through Flutterwave. Choose a suggested or custom amount, currency, and whether your name should appear publicly.
- **Contact** is for show bookings, features, collaborations, press, and licensing enquiries. Include an event date when relevant.
- **Portfolio** contains the artist biography, releases, milestones, gallery, videos, press, and streaming links.
- Use **About** to read the artist biography and **Home** for featured content and announcements.

### Account help

Choose **Log in** to sign in or **Forgot password?** to request a reset email. Password reset requires the site owner to configure SMTP. Passwords must be at least 12 characters. Google sign-in is available only when the site owner has configured Google OAuth.

## Creator/admin access

The creator is not assigned a built-in password. Admin access is granted to the address configured in the server-side `ADMIN_EMAIL`; credentials and setup tokens are never stored in this guide.

### First-time setup with email and password

1. Ask the site owner/deployer to set `ADMIN_EMAIL` to your email address, and to create strong, unique values for `JWT_SECRET` and `ADMIN_SETUP_TOKEN` in the server environment. Never put these values in a public repository or a `NEXT_PUBLIC_` variable.
2. Ensure the database has been initialized and the site is running.
3. Open `/signup`. Use the exact `ADMIN_EMAIL` address, choose a password of at least 12 characters, and enter the `ADMIN_SETUP_TOKEN` provided privately by the site owner.
4. The first successful signup for that configured address creates the admin account and signs you in. It will take you to `/admin`.
5. On later visits, go to `/login?next=/admin`, enter that email and password, and select **Enter control room**. You can also use **Forgot password?** if SMTP has been configured.

If you already have an account with the configured `ADMIN_EMAIL`, do not try to register it again: sign in with that account at `/login?next=/admin`. After the password is validated, the configured email is granted administrator access.

Keep the setup token private. It is required only when first registering a new account with the configured admin email; it is not your password and is not used for normal login.

### First-time setup with Google

If Google OAuth is enabled, sign in using the Google account whose verified email exactly matches `ADMIN_EMAIL`. The application grants that configured email administrator access. Google sign-in does not require the email/password setup token.

### Admin dashboard

The dashboard is available at `/admin` after signing in with an admin account. If you are signed in as a fan, the dashboard is unavailable; sign out and use the configured creator account.

- **Overview:** review sales, donations, plays, subscribers, and the recent 14-day earnings chart.
- **Songs:** create and edit tracks; set the title, genre, price, free/published status, cover, full audio, and preview. Full audio should be uploaded as private media; upload a short preview separately. Changes to a published track are live immediately. Deleting a track is permanent.
- **Sales / Donations:** review completed and pending transactions.
- **Comments:** hide or approve comments, reply as the artist, or delete a comment.
- **Portfolio:** add or remove milestones, gallery photos, videos, and press quotes.
- **Settings:** update the artist profile, homepage hero, featured song, social links, streaming links, and other site presentation options. Saved settings take effect immediately.

Store full masters only in the private Supabase Storage bucket in production.

## Site owner checklist

- Configure PostgreSQL, `ADMIN_EMAIL`, `ADMIN_SETUP_TOKEN`, and a strong `JWT_SECRET`; initialize the schema as described in [Project Setup](SETUP.md).
- Configure SMTP before relying on password resets, Google OAuth before offering Google login, and Flutterwave before accepting live payments.
- Configure the Supabase public and private media buckets before uploading production content.
- Use test-mode payment credentials for checkout testing. Complete a small end-to-end purchase and verify the download flow before launch.
- Keep database backups and rotate secrets if they are exposed. Never commit `.env.local` or production credentials.

## Recommended future additions

These are useful enhancements, not blockers to the current build:

1. Add automated unit/integration tests and a CI workflow; the repository currently has lint, type-check, and build scripts but no test script.
2. Add an admin bookings inbox and subscriber export/management tools; the site currently accepts booking enquiries and gathers subscribers but those records are not managed in the dashboard.
3. Use a shared/distributed rate limiter for production deployments with multiple instances; the current login limiter stores counters in process memory.
4. Consider replacing remaining raw `<img>` elements with optimized image handling; ESLint currently reports image-performance warnings.
