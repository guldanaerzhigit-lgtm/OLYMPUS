# OLYMPUS invitation registration

Account creation is handled by Firebase Cloud Functions using the Admin SDK. The browser never assigns a role or creates privileged user profiles.

## Roles
- Super Admin can invite a School Admin after approving a school.
- School Admin can invite Teachers and Students from the school workspace.
- Invite links are single-use and expire after 72 hours.
- Existing Firebase Auth accounts are not overwritten. If an email already exists, the invitee must sign in to the existing account and contact the school administrator to link it.

## Deploy

1. Install the Firebase CLI and sign in:
   `npm install -g firebase-tools`
   `firebase login`
2. Select the existing project:
   `firebase use olympus-4444e`
3. Set the Resend API key as a Firebase secret:
   `firebase functions:secrets:set RESEND_API_KEY`
4. Deploy:
   `firebase deploy --only functions,firestore:rules`

During deployment, provide these function parameters:
- `APP_BASE_URL`: the HTTPS Cloudflare Pages URL for this OLYMPUS site (for example, your actual `*.pages.dev` address).
- `EMAIL_FROM`: a sender address on a domain verified in Resend, for example `OLYMPUS <noreply@your-verified-domain.kz>`.

The Resend domain must be verified before sending production email. Cloud Functions deployment may require the Firebase project to use the Blaze billing plan. Never put the Resend API key or Firebase service-account JSON in the browser app or GitHub source.

## Local frontend
From the repository root run `npm install` and `npm run build`. Cloudflare Pages continues to build the frontend from the root project; Cloud Functions are deployed separately with the Firebase CLI.
