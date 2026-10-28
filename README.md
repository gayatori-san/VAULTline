# VAULTline 👻

A whimsical cybersecurity mini-app for password-strength feedback and secure account access.

## Vercel-ready architecture

- Static front end: `public/index.html`
- Serverless Node.js endpoints: `api/password-strength.js` and `api/auth.js`
- Authentication provider: Supabase Auth (password hashing, email verification, reset flows handled by Supabase)
- Deployment config: `vercel.json`

This repository was created as a Vercel-compatible implementation. It does not require a long-running Express server or local SQLite database.

## Deploy

1. Create a Supabase project.
2. In Supabase Authentication settings, configure your site URL and allowed redirect URLs to your Vercel deployment URL.
3. Import this repository into Vercel as a new project. Framework preset can be **Other**; root directory is the repository root.
4. In Vercel → Settings → Environment Variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Redeploy after setting variables.
6. Open the Vercel URL and test password strength, account creation, sign-in, and reset email.

The anon/publishable key is designed for browser-facing use; never add a Supabase service-role key to this project. Configure Supabase Auth email confirmation and rate limits before using this beyond a demo.

## Local development

Install the Vercel CLI and run:

```bash
npm install
npx vercel dev
```

## Security notes

- Passwords are submitted over HTTPS to Supabase Auth; this app does not store password hashes or credentials in its own database.
- The strength endpoint never logs or stores the submitted password.
- Sign-in access tokens are held in `sessionStorage` for the current browser tab, not persisted in local storage. For a production application with sensitive data, prefer a backend-managed HttpOnly session cookie architecture.
- Add CAPTCHA / abuse protection and verify email-confirmation settings before opening registration publicly.
- The strength checker is educational guidance, not a guarantee that a password is unguessable.

## API

- `POST /api/password-strength` — accepts `{ "password": "..." }`, returns score, label, checks and advice.
- `POST /api/auth` — accepts `{ "action": "signup|login|reset", "email": "...", "password": "..." }`. Password is not required for reset.

## Stack

HTML · CSS · JavaScript · Vercel Functions · Supabase Auth
