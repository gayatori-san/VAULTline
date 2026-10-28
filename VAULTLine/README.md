# Vaultline — Whimsical Cybersecurity Edition

Vaultline pairs a warm, whimsical interface with practical authentication security controls. The design uses a paper-like background, lavender accents, a friendly ghost vault guardian, tiny stars, and gentle microcopy—while keeping the security behavior on the backend.

## Run locally
Requirements: Node.js 20+
```bash
npm install
cp .env.example .env
# Set SESSION_SECRET to a unique random value before production use
npm start
```
Open http://localhost:3000.

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Features
- Live password strength checklist (12+ characters, lowercase, uppercase, number, symbol)
- Registration and login flows with server-side validation
- Argon2id password hashing; plaintext passwords are not stored
- SQLite persistence and prepared SQL statements
- Rate-limited registration/login attempts
- Session ID regeneration on successful registration/login
- HttpOnly, SameSite session cookies; Secure enabled in production
- Helmet security headers and request body size limits
- Authentication security event journal with minimized email hints, visible after sign-in

## API
- `GET /api/me`
- `GET /api/security/events` (requires sign-in)
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`

## Production checklist
This is an educational starter, not a security-audited production identity provider. Before real deployment, add CSRF protection appropriate to the hosting setup, email verification, password reset, account deletion and data-retention flows, breached-password screening, monitoring/alerting, and a reviewed persistent session store. Use HTTPS, set `NODE_ENV=production`, and store a unique `SESSION_SECRET` in the hosting provider's secret manager. Do not use the development fallback secret in production. Configure proxy trust appropriately behind a reverse proxy and keep dependencies patched.
