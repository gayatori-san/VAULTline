const COMMON = new Set([
  "password", "password123", "qwerty123", "letmein", "admin123",
  "iloveyou", "welcome123", "123456789", "changeme"
]);

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length > 256) return res.status(400).json({ error: "Password is too long." });

  const checks = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    notCommon: password.length > 0 && !COMMON.has(password.toLowerCase())
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong", "Vault-grade"];
  return res.status(200).json({
    score,
    label: labels[score],
    checks,
    advice: score < 5
      ? "Aim for 12+ characters and mix character types. A unique passphrase is even better."
      : "Nice. Keep it unique to this account and store it in a password manager."
  });
}