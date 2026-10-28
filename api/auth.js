const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Origin");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: "Authentication is not configured yet. Add Supabase environment variables in Vercel." });
  }

  const action = req.body?.action;
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!["signup", "login", "reset"].includes(action)) return res.status(400).json({ error: "Unsupported action." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: "Enter a valid email address." });
  if (action !== "reset" && (password.length < 12 || password.length > 256)) {
    return res.status(400).json({ error: "Use a password between 12 and 256 characters." });
  }

  const base = SUPABASE_URL.replace(/\/$/, "");
  const endpoint = action === "signup" ? "/auth/v1/signup"
    : action === "login" ? "/auth/v1/token?grant_type=password"
    : "/auth/v1/recover";
  const payload = action === "reset" ? { email } : { email, password };

  try {
    const upstream = await fetch(base + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(payload)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const safeMessage = action === "login"
        ? "Sign-in failed. Check your credentials and try again."
        : (data.msg || data.message || data.error_description || "Authentication request failed.");
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: safeMessage });
    }
    return res.status(200).json({
      message: action === "signup" ? "Check your email if confirmation is enabled."
        : action === "reset" ? "If that account exists, a reset email will be sent."
        : "Signed in.",
      session: action === "login" ? data : undefined,
      user: data.user || undefined
    });
  } catch {
    return res.status(502).json({ error: "Authentication service is temporarily unavailable." });
  }
}