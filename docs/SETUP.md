# Project Setup

## 1. Install and configure

Use Node.js 20.9 or newer, then install the project packages and create the local environment file:

```powershell
npm install
Copy-Item .env.example .env.local
```

Configure `DATABASE_URL` with a PostgreSQL connection string. Set `DIRECT_URL` to a direct database connection when available; Drizzle uses it for schema changes. Keep secrets private; `.env.local` is excluded from source control. Set `ADMIN_EMAIL` to the artist's account email. Generate separate random values for `JWT_SECRET` and `ADMIN_SETUP_TOKEN`:

```powershell
node -p "require('crypto').randomBytes(48).toString('base64url')"
```

Never put secret keys or database passwords in variables prefixed with `NEXT_PUBLIC_`. In production, set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.

## 2. Initialize PostgreSQL

Create or update the database tables from the Drizzle schema:

```powershell
npx drizzle-kit push
```

The application stores account profiles, content, and purchases in PostgreSQL. `drizzle-kit push` applies the current schema, including password-reset token storage. Back up production data before applying schema changes.

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

## 4. Configure persistent media uploads

In production, configure an S3-compatible object store such as Tigris or Cloudflare R2. Public media (covers, previews, and gallery images) is served from the public bucket URL. Purchased full audio is stored in the private bucket and served using short-lived signed URLs after purchase checks.

### Tigris Object Storage

1. In the [Tigris Console](https://console.storage.dev), create two buckets: one for public media and a separate private bucket for purchased full audio. Enable public reads or a public custom domain for the public bucket only; do not make the audio bucket public.
2. Create separate access keys for the public and private buckets (or one key with permissions to both). The private key needs object read/write access on the private bucket; the public key needs object write access on the public bucket. Treat each key pair as credentials.
3. Configure the app with Tigris's S3 endpoint and virtual-host addressing. Replace the bucket names, keys, and public URL with the values from your Tigris setup:

   ```dotenv
   S3_ENDPOINT=https://t3.storage.dev
   S3_REGION=auto
   S3_FORCE_PATH_STYLE=false
   S3_PUBLIC_BUCKET=your-public-media-bucket
   S3_PRIVATE_BUCKET=your-private-audio-bucket
   S3_ACCESS_KEY_ID=tid_your_access_key
   S3_SECRET_ACCESS_KEY=tsec_your_secret_key
   S3_PUBLIC_ACCESS_KEY_ID=tid_public_key_optional
   S3_PUBLIC_SECRET_ACCESS_KEY=tsec_public_secret_optional
   S3_PRIVATE_ACCESS_KEY_ID=tid_private_key_optional
   S3_PRIVATE_SECRET_ACCESS_KEY=tsec_private_secret_optional
   S3_PUBLIC_URL=https://your-public-media-bucket.t3.storage.dev
   ```

   Separate public/private pairs override the shared pair; if a key is only for one bucket, set it in the corresponding pair. `S3_PUBLIC_URL` must be a working public URL for the public bucket. Keep the private bucket private.
4. Admin uploads are sent directly from the browser to Tigris with short-lived signed PUT URLs, bypassing Vercel function body limits. In Tigris bucket CORS settings, allow your production site origin (and localhost during development). For an S3-style CORS editor, use a rule like this and replace the origins with your actual app origins:

   ```json
   [{"AllowedOrigins":["https://YOUR_PRODUCTION_DOMAIN","http://localhost:3000"],"AllowedMethods":["PUT","GET","HEAD"],"AllowedHeaders":["Content-Type"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]
   ```

   Do not use wildcard origins unless you intentionally allow any website to upload using a signed URL. Add all four split credential variables and the bucket names to Vercel, then redeploy.
5. Full audio, full video, and album ZIP archives use the private bucket. Audio/video previews, album preview clips, and images use the public bucket. `/admin` has Albums, Download videos, and Merch sections; the public merch store is at `/merch`. Apply all additive SQL files in `docs/migrations/` to an existing database after taking a backup. Merch checkout collects the buyer's size and delivery details; manage fulfillment from Admin → Sales.

Tigris's AWS SDK configuration requires virtual-host-style requests; `S3_FORCE_PATH_STYLE=false` configures this. For other S3-compatible providers, use their required addressing style. `S3_FORCE_PATH_STYLE` defaults to `true` to preserve the existing Cloudflare R2-style configuration.

### Other S3-compatible storage

Set `S3_ENDPOINT`, `S3_REGION`, `S3_PUBLIC_BUCKET`, `S3_PRIVATE_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_PUBLIC_URL` to the values from your provider. `S3_FORCE_PATH_STYLE` should be set to `false` or `true` to match the provider's S3 SDK instructions. Keep private audio in a private bucket.

When S3 credentials are not configured, development uploads are stored locally under `public/uploads/` and `.private-uploads/`. Public media can use Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured; do not use public Blob storage for full audio. Production private audio uploads require complete S3-compatible storage configuration, and production public uploads require complete S3-compatible storage or Vercel Blob. Local filesystem storage is not suitable for production or ephemeral deployments; production uploads now fail explicitly when no persistent storage is configured.

The supplied artist photos and logo are bundled under `public/pics/` and used as the default hero and portfolio gallery. The admin can replace the hero photo, upload more gallery images, edit the artist profile and biography, publish songs, curate the portfolio, moderate comments, and update social and streaming links.

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
4. Configure durable media storage before enabling admin uploads. Set the S3 variables for both public and private buckets, or use Vercel Blob for public media plus S3 for private full audio. Never expose the private bucket publicly.
5. Configure Tigris bucket CORS for direct browser PUTs; large media does not pass through a Vercel function. The signed upload endpoint enforces media type and size limits. Apply the SQL files under `docs/migrations/` to the production database after backing it up; these add the album/video catalog and merch order columns.
6. Configure shared rate limiting at the host, CDN, or WAF for login, password reset, signup, checkout, donations, comments, and upload endpoints. The app's in-memory rate limiter is only a per-process fallback and does not coordinate across serverless instances or multiple replicas.
7. Deploy to a staging URL first. Test admin login, password recovery email, any enabled Google sign-in, public media upload, a private audio download, and Flutterwave test-mode checkout plus webhook. Confirm cancelled/failed payments never unlock audio.
8. Only after these checks pass, set production payment credentials and provider callback URLs, redeploy, and make a small live transaction that you can refund through the provider dashboard.

The CI workflow is a build and static-check gate, not a full automated test suite. Add automated integration tests for account lifecycle, payment settlement, and download authorization before relying on unattended releases.

For an existing production database, do not blindly run `drizzle-kit push` against live data. Back it up first, review the schema diff, and apply changes in a maintenance window. This project currently does not include a migration history, so establish a Drizzle migration baseline before adopting generated migrations for ongoing production schema changes.

### Netlify

Connect the GitHub repository to Netlify and deploy the `master` branch. The included `netlify.toml` uses the Next.js build command and standard Next.js output so Netlify's Next.js adapter can handle server rendering and API routes. Set the required environment variables in the Netlify site settings. Set `NEXT_PUBLIC_SITE_URL` to the assigned `https://<site>.netlify.app` URL, then redeploy.

For Google sign-in, add `https://<site>.netlify.app/api/auth/google/callback` to the Google OAuth client's authorized redirect URIs. Configure Flutterwave's webhook at `https://<site>.netlify.app/api/payments/webhook/flutterwave` if payments are enabled. Netlify's filesystem is ephemeral: configure S3-compatible storage before using uploads.

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
