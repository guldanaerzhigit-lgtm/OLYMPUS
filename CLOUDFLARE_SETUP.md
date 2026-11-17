# OLYMPUS — Cloudflare Pages registration setup

The invitation API is implemented as Cloudflare Pages Functions in `functions/api/[[route]].ts`. It uses Firebase Authentication and Firestore through Google REST APIs. Firebase Cloud Functions and the Firebase CLI are no longer used.

## 1. Cloudflare Pages deployment

The GitHub-connected Pages project must use:
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

Pushes to the production branch deploy automatically. Pages Functions are discovered from the root-level `functions/` directory.

## 2. Create a Firebase service account key

In Firebase Console, open project `olympus-4444e` → Project settings → Service accounts → Generate new private key. Keep the downloaded JSON private.

The service account needs:
- Firebase Authentication Admin (`roles/firebaseauth.admin`)
- Cloud Datastore User (`roles/datastore.user`)

Ensure Identity Toolkit API and Cloud Firestore API are enabled for the Google Cloud project.

## 3. Add Cloudflare environment variables

Cloudflare Dashboard → Workers & Pages → OLYMPUS → Settings → Variables and Secrets.

Add these Production values (and Preview values only if preview deployments are used):

| Name | Type | Value |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Secret (Encrypt) | Entire contents of the service-account JSON file |
| `FIREBASE_API_KEY` | Variable | Firebase Web API key from `src/firebase.ts` |
| `APP_BASE_URL` | Variable | Exact HTTPS production Pages URL, without trailing slash |
| `RESEND_API_KEY` | Secret (Encrypt, optional) | Resend API key |
| `EMAIL_FROM` | Variable (optional) | Verified Resend sender, e.g. `OLYMPUS <noreply@your-domain.kz>` |

If Resend is not configured, the invitation will still be created and the dashboard will display a link that can be copied and sent manually.

After saving variables and secrets, trigger a new deployment (Retry deployment in Pages → Deployments).

## 4. How registration works

- Super Admin can invite School Admins to active schools.
- School Admin can invite Teachers and Students to their own school.
- The API validates the signed-in Firebase user and their Firestore role before issuing an invitation.
- Invite tokens are random, stored only as SHA-256 hashes, expire after 72 hours, and are single-use.
- The server creates the Firebase Auth account, assigns custom claims, and creates the Firestore profile.
- Browser code never receives service-account credentials and cannot choose its own role.

## 5. Smoke test

1. Open the production site and sign in as Super Admin.
2. Approve a school application so that an active school exists.
3. Open Invitations and invite a School Admin email address.
4. Open the generated link in a private/incognito window and create the account.
5. Confirm the new account lands on `/school`.
6. Repeat from the School Admin account for a Teacher and Student.

Do not paste the service-account JSON or Resend API key into GitHub, chat, or frontend source.
