import { Router } from "express";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { sendPasswordResetEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

function pageHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — Mountain of Supremacy</title>
<style>
  *{box-sizing:border-box;}
  body{margin:0;padding:0;background:#0a0a0f;font-family:sans-serif;color:#c9b77e;display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .card{max-width:440px;width:100%;margin:24px;padding:32px;background:#13131f;border:1px solid #2a2a40;border-radius:16px;}
  h2{margin:0 0 8px;font-size:18px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;}
  p{margin:0 0 16px;font-size:14px;color:#a0a0b8;line-height:1.6;}
  label{display:block;font-size:10px;color:#666680;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;}
  input{width:100%;padding:12px 14px;background:#0d0d18;border:1px solid #2a2a40;border-radius:10px;color:#e0e0f0;font-size:14px;margin-bottom:14px;outline:none;}
  input:focus{border-color:#c9a84c;}
  button{width:100%;padding:14px;background:#c9a84c;border:none;border-radius:12px;color:#0a0a0f;font-weight:700;font-size:13px;letter-spacing:2px;cursor:pointer;text-transform:uppercase;}
  button:hover{opacity:0.9;}
  .err{background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:8px;padding:10px 14px;color:#ef4444;font-size:13px;margin-bottom:14px;}
  .ok{background:rgba(52,211,153,0.1);border:1px solid #34d399;border-radius:8px;padding:10px 14px;color:#34d399;font-size:13px;margin-bottom:14px;}
  .back{display:inline-block;margin-top:16px;font-size:12px;color:#666680;text-decoration:none;}
</style>
</head>
<body>
<div class="card">
  <h2>⛰ Mountain of Supremacy</h2>
  ${bodyHtml}
</div>
</body>
</html>`;
}

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update("mountain_salt_2025:" + pw).digest("hex");
}

// GET /api/auth/verify-email?token=xxx
router.get("/auth/verify-email", async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) {
    res.status(400).send(pageHtml("Invalid Link", `<p class="err">Missing verification token.</p>`));
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.verificationToken, token));
  const user = rows[0];

  if (!user) {
    res.status(400).send(pageHtml("Invalid Link", `<p class="err">This verification link is invalid or has already been used.</p>`));
    return;
  }

  if (user.verificationTokenExpires && Date.now() > user.verificationTokenExpires) {
    res.status(400).send(pageHtml("Link Expired", `<p class="err">This verification link has expired. Please request a new one from the game.</p>`));
    return;
  }

  await db.update(usersTable)
    .set({ emailVerified: true, verificationToken: null, verificationTokenExpires: null })
    .where(eq(usersTable.usernameLower, user.usernameLower));

  logger.info({ username: user.username }, "Email verified");
  res.send(pageHtml("Email Verified", `
    <p class="ok">✓ Your email has been verified successfully!</p>
    <p>You can now log in to <strong>Mountain of Supremacy</strong> using your username and password.</p>
    <p style="font-size:12px;color:#555570;">You may close this tab and return to the game.</p>
  `));
});

// GET /api/auth/reset-password?token=xxx  — show reset form
router.get("/auth/reset-password", async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) {
    res.status(400).send(pageHtml("Invalid Link", `<p class="err">Missing reset token.</p>`));
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.resetToken, token));
  const user = rows[0];

  if (!user) {
    res.status(400).send(pageHtml("Invalid Link", `<p class="err">This reset link is invalid or has already been used.</p>`));
    return;
  }
  if (user.resetTokenExpires && Date.now() > user.resetTokenExpires) {
    res.status(400).send(pageHtml("Link Expired", `<p class="err">This password reset link has expired. Please request a new one from the game.</p>`));
    return;
  }

  res.send(pageHtml("Reset Password", `
    <p>Reset the password for <strong>${user.username}</strong>.</p>
    <form method="POST" action="/api/auth/reset-password">
      <input type="hidden" name="token" value="${token}"/>
      <label>New Password</label>
      <input type="password" name="password" placeholder="Min. 6 characters" required minlength="6"/>
      <label>Confirm New Password</label>
      <input type="password" name="confirm" placeholder="Re-enter password" required minlength="6"/>
      <button type="submit">SAVE NEW PASSWORD</button>
    </form>
  `));
});

// POST /api/auth/reset-password  — process reset form
router.post("/auth/reset-password", async (req, res) => {
  const token = String(req.body.token ?? "");
  const password = String(req.body.password ?? "");
  const confirm = String(req.body.confirm ?? "");

  if (!token || !password) {
    res.status(400).send(pageHtml("Error", `<p class="err">Missing token or password.</p>`));
    return;
  }
  if (password !== confirm) {
    res.status(400).send(pageHtml("Reset Password", `
      <p class="err">Passwords do not match.</p>
      <form method="POST" action="/api/auth/reset-password">
        <input type="hidden" name="token" value="${token}"/>
        <label>New Password</label>
        <input type="password" name="password" placeholder="Min. 6 characters" required minlength="6"/>
        <label>Confirm New Password</label>
        <input type="password" name="confirm" placeholder="Re-enter password" required minlength="6"/>
        <button type="submit">SAVE NEW PASSWORD</button>
      </form>
    `));
    return;
  }
  if (password.length < 6) {
    res.status(400).send(pageHtml("Error", `<p class="err">Password must be at least 6 characters.</p>`));
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.resetToken, token));
  const user = rows[0];

  if (!user || (user.resetTokenExpires && Date.now() > user.resetTokenExpires)) {
    res.status(400).send(pageHtml("Invalid Link", `<p class="err">This reset link is invalid or has expired.</p>`));
    return;
  }

  await db.update(usersTable)
    .set({ passwordHash: hashPassword(password), resetToken: null, resetTokenExpires: null })
    .where(eq(usersTable.usernameLower, user.usernameLower));

  logger.info({ username: user.username }, "Password reset");
  res.send(pageHtml("Password Reset", `
    <p class="ok">✓ Your password has been updated successfully!</p>
    <p>You can now log in to <strong>Mountain of Supremacy</strong> with your new password.</p>
    <p style="font-size:12px;color:#555570;">You may close this tab and return to the game.</p>
  `));
});

// POST /api/auth/forgot-password  — send reset email
router.post("/auth/forgot-password", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, reason: "Invalid email address." });
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email));
  const user = rows[0];

  // Always respond OK to avoid email enumeration
  if (!user) {
    res.json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour

  await db.update(usersTable)
    .set({ resetToken: token, resetTokenExpires: expires })
    .where(eq(usersTable.usernameLower, user.usernameLower));

  try {
    await sendPasswordResetEmail(email, user.username, token);
  } catch (err) {
    logger.error({ err }, "Failed to send password reset email");
    res.status(500).json({ ok: false, reason: "Failed to send email. Please try again." });
    return;
  }

  res.json({ ok: true });
});

export default router;
