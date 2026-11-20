# Project Setup

## 1. Install and configure

Use Node.js 20.9 or newer, then install the project packages and create the local environment file:

```powershell
npm install
Copy-Item .env.example .env.local
```

Configure `DATABASE_URL` with the Supabase **Transaction pooler** connection string from the project's **Connect** dialog. Use the pooler on port `6543` for the Vercel runtime. Set `DIRECT_URL` to the Supabase direct connection string from the same dialog for local schema tools. With node-postgres, append `&uselibpqcompat=true` to `sslmode=require` so the connection remains TLS encrypted while using PostgreSQL's documented `require` mode semantics. Keep secrets private; `.env.local` is excluded from source control. Set `ADMIN_EMAIL` to the artist's account email. Generate separate random values for `JWT_SECRET` and `ADMIN_SETUP_TOKEN`:

```powershell
node -p "require('crypto').randomBytes(48).toString('base64url')"
```

Never put secret keys or database passwords in variables prefixed with `NEXT_PUBLIC_`. In production, set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.

## 2. Initialize PostgreSQL

For a new, empty Supabase database, create the application tables from the Drizzle schema:

```powershell
npx drizzle-kit push
```

The application stores account profiles, content, and purchases in Supabase PostgreSQL. `drizzle-kit push` applies the current schema, including password-reset token storage. Back up production data before applying schema changes.

### Existing production data

The production data was migrated to the Supabase PostgreSQL project. For future migrations, take a Supabase backup and use the Supabase connection strings from its **Connect** dialog. Vercel uses the Transaction pooler URI (port `6543`); local Drizzle tools use `DIRECT_URL`. Never commit connection strings. Percent-encode reserved characters in URI passwords.

## 3. Configure email and sign-in

### SMTP (password recovery and account email)

1. Choose an SMTP email provider and verify the sender/domain there. For local testing, a provider sandbox is suitable; for production, use a provider/domain authorized to send your site's mail.
2. Create SMTP credentials in that provider's dashboard. Use its host, port, username, and password. Port `587` is commonly used with STARTTLS; use the exact values and encryption method documented by your provider.
3. Add the credentials to `.env.local` for local work and to your hosting provider's **server-side** environment settings for production:

   ```dotenv
   SMTP_HOST=smtp.provider.example
   SMTP_PORT=587
   SMTP_USER=your-smtp-username
   SMTP_PASSWORD=your-smtp-password
   SMTP_FROM=King Rhymes <no-reply@your-domain.example>
   ```

   `SMTP_FROM` must use a sender address accepted by the provider. Keep the password private and never use a `NEXT_PUBLIC_` variable for it.
4. Restart the local server or redeploy the production site after changing environment variables. Test password recovery from `/forgot-password` and confirm that the email arrives. Reset links expire after 30 minutes.

For Gmail SMTP specifically, enable 2-Step Verification on the Google account, create an **App password** in Google Account security settings, and use `smtp.gmail.com`, port `587`, the Gmail address as `SMTP_USER`, and that app password as `SMTP_PASSWORD`. Do not use the account's normal password. Gmail may be unsuitable for production/high-volume sending; follow Google's sending limits and use a transactional provider when appropriate.

### Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a project. Configure the OAuth consent screen/Google Auth Platform with an app name, support email, and developer contact email. Add the requested scopes (`openid`, `email`, and `profile`); while the app is in **Testing**, add the Google accounts that should be able to sign in as test users.
2. Create an OAuth client ID with application type **Web application**. Under **Authorized redirect URIs**, add the exact callback for each environment:

   ```text
   http://localhost:3000/api/auth/google/callback
   https://YOUR_PUBLIC_DOMAIN/api/auth/google/callback
   ```

   Replace `YOUR_PUBLIC_DOMAIN` with the actual domain, with no trailing slash before `/api`. The URI must match the site origin and path exactly.
3. Copy the generated client ID and client secret into `.env.local` for local development and the host's server-side environment settings for production:

   ```dotenv
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   NEXT_PUBLIC_SITE_URL=https://YOUR_PUBLIC_DOMAIN
   ```

   For local development, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. It must match the origin used for the sign-in flow. Never expose the client secret in a `NEXT_PUBLIC_` variable.
4. Restart the local server or redeploy after changing variables, then test **Continue with Google** on `/login` and `/signup`. Google sign-in requires a verified email. To allow anyone outside your test-user list to sign in, publish/verify the consent configuration as required by Google.

For email/password setup, create the account at `/signup` using the exact `ADMIN_EMAIL` value and provide `ADMIN_SETUP_TOKEN`. The first successful signup for that address becomes the administrator. If an account for that email already exists, a successful password login promotes that configured address to administrator. Alternatively, Google sign-in grants administrator access to the configured email only when Google confirms that email as verified. Other accounts receive fan access. See [the webapp user guide](USER_GUIDE.md) for creator login and everyday usage.

## 4. Configure Supabase Storage

Supabase Storage is the only remote media store. Create a public bucket named `media-public` for covers, previews, gallery photos, and hero images. Create a private bucket named `media-private` for full audio, video, and album archives. Keep the second bucket private so downloads continue through the app's purchase checks.

Configure the server with `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or the project's server-side secret key), `SUPABASE_PUBLIC_MEDIA_BUCKET=media-public`, and `SUPABASE_PRIVATE_MEDIA_BUCKET=media-private`. The secret key must never use a `NEXT_PUBLIC_` prefix or be committed. Admin uploads use signed upload URLs and go directly from the browser to Supabase, avoiding Vercel request-body limits. Production private downloads use short-lived signed URLs after the app verifies the purchase.

Supabase Free projects cap individual files at 50 MB. Larger audio, video, and archive uploads require raising the Storage file size limit on a paid Supabase plan. For large files, use Supabase resumable uploads when the project's configured cap allows it. Local development may use `public/uploads/` and `.private-uploads/` when no Supabase server key is present. Never use local filesystem media storage in production.

Full audio, full video, and album ZIP archives use the private bucket. Audio/video previews and images use the public bucket. `/admin` has Albums, Upload videos, and Merch sections; the public merch store is at `/merch`. Apply additive SQL files in `docs/migrations/` after taking a database backup.

## 5. Run the site

```powershell
npm run dev
```

Open `http://localhost:3000`. Sign in with the configured admin account and open `/admin` to manage songs, the home page, portfolio, gallery, comments, and site settings. The footer, music pages, and portfolio use the admin-managed social and streaming links.

For production, set the environment variables in the hosting provider's secret/configuration settings and set `NODE_ENV=production`. Do not place production credentials in the repository.

## 6. Deploy

### Pre-deployment checklist

1. Push the project to GitHub and confirm the `CI` workflow passes on the deployment branch. It runs lint, typecheck, applies the Drizzle schema to a temporary PostgreSQL database, and builds the app. The database and secrets in CI are disposable test values; do not copy them to production.
2. Configure production secrets in the host dashboard, not in Git. At minimum set `DATABASE_URL`, a high-entropy `JWT_SECRET`, `ADMIN_EMAIL`, and the exact HTTPS `NEXT_PUBLIC_SITE_URL`. Add `ADMIN_SETUP_TOKEN` for initial admin signup; remove or rotate it after the administrator account is created. Add provider credentials only for features you have enabled.
3. Configure the PostgreSQL provider's backups and point-in-time recovery, and verify you can restore a backup before storing real purchases or user accounts.
4. Configure Supabase Storage before enabling admin uploads. Set the Supabase URL and server-side Storage secret in Vercel, and create the public and private buckets as documented above. Never expose the private bucket publicly. Set `SUPABASE_MAX_FILE_SIZE_BYTES` to the size configured in Supabase (the Free plan default is 52428800 bytes); the app defaults to that 50 MB cap.
5. Large admin uploads use resumable Supabase Storage uploads directly from the browser and enforce media type and size limits before signing. Apply the SQL files under `docs/migrations/` to the production database after backing it up; these add the album/video catalog and merch order columns.
6. Configure shared rate limiting at the host, CDN, or WAF for login, password reset, signup, checkout, donations, comments, and upload endpoints. The app's in-memory rate limiter is only a per-process fallback and does not coordinate across serverless instances or multiple replicas.
7. Deploy to a staging URL first. Test admin login, password recovery email, any enabled Google sign-in, public media upload, a private audio download, and Flutterwave test-mode checkout plus webhook. Confirm cancelled/failed payments never unlock audio.
8. Only after these checks pass, set production payment credentials and provider callback URLs, redeploy, and make a small live transaction that you can refund through the provider dashboard.

The CI workflow is a build and static-check gate, not a full automated test suite. Add automated integration tests for account lifecycle, payment settlement, and download authorization before relying on unattended releases.

For an existing production database, do not blindly run `drizzle-kit push` against live data. Back it up first, review the schema diff, and apply changes in a maintenance window. This project currently does not include a migration history, so establish a Drizzle migration baseline before adopting generated migrations for ongoing production schema changes.

### Vercel

Import the connected GitHub repository into Vercel and use the Next.js preset with the project root as the root directory. Vercel manages the Next.js output mode automatically. Add the runtime variables in **Project Settings → Environment Variables** for Production and Preview as appropriate. At minimum, set `DATABASE_URL` to Supabase's transaction pooler connection string, a high-entropy `JWT_SECRET`, `ADMIN_EMAIL`, and the exact HTTPS `NEXT_PUBLIC_SITE_URL`. Add `DIRECT_URL` for local schema tooling only; it is not needed by application requests.

Admin uploads use signed Supabase Storage URLs. Configure the `media-public` and `media-private` buckets and the server-side Supabase secret in Vercel. Full audio, video, and album archives use the private bucket; covers, previews, gallery photos, and hero images use the public bucket. After adding or changing Vercel environment variables, redeploy and verify uploads and a private download.

Add `https://YOUR_PUBLIC_DOMAIN/api/auth/google/callback` to the Google OAuth client's authorized redirect URIs. Configure Flutterwave's webhook at `https://YOUR_PUBLIC_DOMAIN/api/payments/webhook/flutterwave` if payments are enabled.

### Docker

Build and run the included Docker image. Its build stage explicitly selects standalone output:

```powershell
docker build -t king-rhymes .
docker run --env-file .env.local -p 3000:3000 king-rhymes
```

Pass production secrets through the container environment rather than baking them into the image.

### Namecheap Node.js hosting or VPS

On a Namecheap VPS/Node.js host, use Node.js 20 or newer. From the project directory, install dependencies, set the production environment variables in the hosting control panel, and build the standard Next.js output:

```bash
npm ci
NEXT_OUTPUT=default npm run build
NEXT_OUTPUT=default npm start
```

In PowerShell, set the output mode for both build and start:

```powershell
$env:NEXT_OUTPUT = "default"
npm ci
npm run build
npm start
```

For a VPS using PM2, build the standard Next.js output and start the app from the project directory with `pm2 start ecosystem.config.json`. The PM2 configuration sets `NEXT_OUTPUT=default` so `next start` uses the matching output mode. Configure the hosting reverse proxy to forward HTTPS traffic to the app's port (3000 by default). Namecheap shared hosting plans may not support persistent Next.js server processes; use a VPS or another host if the plan does not provide Node.js application hosting.

Payment provider steps are documented separately in [the Flutterwave setup guide](payments/FLUTTERWAVE.md).
