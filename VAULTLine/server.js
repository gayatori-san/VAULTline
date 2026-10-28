require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const rateLimit = require("express-rate-limit");
const argon2 = require("argon2");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === "production";
const secret = process.env.SESSION_SECRET;
if (production && (!secret || secret.length < 32)) throw new Error("Set a unique SESSION_SECRET (at least 32 characters) in production.");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "vaultline.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS security_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_type TEXT NOT NULL,
 email_hint TEXT,
 outcome TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function logEvent(type, email, outcome) {
  const hint = typeof email === "string" ? email.trim().slice(0, 2) + "…" : null;
  db.prepare("INSERT INTO security_events (event_type, email_hint, outcome) VALUES (?, ?, ?)").run(type, hint, outcome);
}
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(session({
 name: "vaultline.sid",
 secret: secret || "local-development-secret-change-this-before-deploying",
 resave: false, saveUninitialized: false,
 store: new SQLiteStore({ db: "sessions.sqlite", dir: dataDir }),
 cookie: { httpOnly: true, sameSite: "lax", secure: production, maxAge: 7200000 }
}));
const limiter = rateLimit({
 windowMs: 15 * 60 * 1000, limit: 10,
 standardHeaders: "draft-7", legacyHeaders: false,
 handler: (req, res) => {
   logEvent("RATE_LIMIT", req.body?.email, "BLOCKED");
   res.status(429).json({ error: "A little too much activity. Pause and try again soon." });
 }
});
app.use(express.static(path.join(__dirname, "public")));

function validEmail(v) { return typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function passwordIssues(p) {
 const out = [];
 if (typeof p !== "string" || p.length < 12) out.push("Use at least 12 characters.");
 if (typeof p !== "string" || p.length > 128) out.push("Use no more than 128 characters.");
 if (typeof p !== "string" || !/[a-z]/.test(p)) out.push("Add a lowercase letter.");
 if (typeof p !== "string" || !/[A-Z]/.test(p)) out.push("Add an uppercase letter.");
 if (typeof p !== "string" || !/[0-9]/.test(p)) out.push("Add a number.");
 if (typeof p !== "string" || !/[^A-Za-z0-9]/.test(p)) out.push("Add a symbol.");
 return out;
}
app.get("/api/me", (req, res) => {
 if (!req.session.userId) return res.json({ user: null });
 const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(req.session.userId);
 if (!user) return res.json({ user: null });
 res.json({ user });
});
app.get("/api/security/events", (req, res) => {
 if (!req.session.userId) return res.status(401).json({ error: "Sign in to view the security journal." });
 const events = db.prepare("SELECT event_type, email_hint, outcome, created_at FROM security_events ORDER BY id DESC LIMIT 20").all();
 res.json({ events });
});
app.post("/api/register", limiter, async (req, res) => {
 const { name, email, password, confirmPassword } = req.body || {};
 if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
 if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
 if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match." });
 const issues = passwordIssues(password);
 if (issues.length) return res.status(400).json({ error: issues.join(" ") });
 const normalized = email.trim().toLowerCase();
 try {
  const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const result = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name.trim(), normalized, hash);
  logEvent("REGISTER", normalized, "SUCCESS");
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = Number(result.lastInsertRowid);
  res.status(201).json({ message: "Your little corner of the vault is ready.", user: { id: Number(result.lastInsertRowid), name: name.trim(), email: normalized } });
 } catch (e) {
  if (e?.code === "SQLITE_CONSTRAINT_UNIQUE") { logEvent("REGISTER", normalized, "DENIED"); return res.status(409).json({ error: "An account with this email already exists." }); }
  console.error("Registration error:", e.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
 }
});
app.post("/api/login", limiter, async (req, res) => {
 const { email, password } = req.body || {};
 if (!validEmail(email) || typeof password !== "string" || password.length > 128) return res.status(400).json({ error: "Enter a valid email and password." });
 const normalized = email.trim().toLowerCase();
 const user = db.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").get(normalized);
 const ok = user ? await argon2.verify(user.password_hash, password).catch(() => false) : false;
 if (!ok) { logEvent("LOGIN", normalized, "DENIED"); return res.status(401).json({ error: "Email or password didn't match. Try again." }); }
 logEvent("LOGIN", normalized, "SUCCESS");
 await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
 req.session.userId = user.id;
 res.json({ message: "Welcome back to your vault.", user: { id: user.id, name: user.name, email: user.email } });
});
app.post("/api/logout", (req, res) => {
 logEvent("LOGOUT", "", "SUCCESS");
 req.session.destroy(err => {
  if (err) return res.status(500).json({ error: "Could not log out just yet." });
  res.clearCookie("vaultline.sid", { httpOnly: true, sameSite: "lax", secure: production });
  res.json({ message: "Safely logged out." });
 });
});
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`Vaultline is open at http://localhost:${PORT}`));
