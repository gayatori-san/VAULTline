# VAULTline 🔐

**VAULTline** is a lightweight, privacy-conscious password strength checker. It evaluates basic password hygiene and checks whether a password appears in known breaches using the **Have I Been Pwned (HIBP) Pwned Passwords database**.

## Features

- Password strength feedback based on length, common-password checks, and predictable patterns.
- Compromised-password screening against the HIBP Pwned Passwords dataset.
- Clear warning when a password is found in known breaches, including the reported occurrence count.
- A minimal, responsive interface built with HTML, CSS, and JavaScript.

## Have I Been Pwned integration

VAULTline uses the [Have I Been Pwned Pwned Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords) to check for known exposed passwords.

The check uses a **k-anonymity range request**:

1. The browser calculates a SHA-1 hash of the entered password locally.
2. Only the first five characters of that hash are sent to the HIBP range API.
3. The browser compares the returned hash suffixes locally to find a match and its reported count.

The full password and full hash are not sent to HIBP. A match means the password has appeared in the dataset and should not be used. A no-match result does **not** guarantee that a password has never been exposed or that it is safe.

## Password guidance

- Use a long, unique password or passphrase. VAULTline recommends at least 15 characters for a password used by itself.
- Avoid common and predictable passwords.
- Never reuse a password across accounts.
- If a password is flagged as compromised, replace it with a new, unique password.

The score is educational guidance, not a guarantee of security. Do not enter a password you currently use for a sensitive account into an unfamiliar website.

## Tech stack

- HTML
- CSS
- JavaScript (browser-side password checks and SHA-1 hashing)
- Have I Been Pwned Pwned Passwords API
- Vercel (static hosting / deployment)

## Run locally

Open `public/index.html` in a browser, or serve the repository with a local static web server. The HIBP check requires an internet connection.

## Deployment

Import the repository into Vercel and set the **Root Directory** to the repository root (leave it blank rather than entering `VAULTline`). Redeploy after saving the setting.

## Credits

- [Have I Been Pwned](https://haveibeenpwned.com/) — Pwned Passwords breach dataset and range API.
