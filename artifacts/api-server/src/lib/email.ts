import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Mountain of Supremacy <onboarding@resend.dev>";

function getAppDomain(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return domains.split(",")[0].trim();
  const dev = process.env.REPLIT_DEV_DOMAIN;
  if (dev) return dev;
  return "localhost:8080";
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.warn({ to, subject }, "RESEND_API_KEY not configured — email not sent (dev preview below)");
    logger.info({ to, subject }, "DEV EMAIL PREVIEW — configure RESEND_API_KEY to send real emails");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "Resend API error");
    throw new Error("Email send failed");
  }
}

function emailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#0a0a0f;font-family:sans-serif;color:#c9b77e;}
  .wrap{max-width:480px;margin:40px auto;padding:32px;background:#13131f;border:1px solid #2a2a40;border-radius:16px;}
  h2{margin:0 0 12px;font-size:20px;color:#c9a84c;letter-spacing:2px;}
  p{margin:0 0 16px;font-size:14px;color:#a0a0b8;line-height:1.6;}
  a.btn{display:inline-block;margin-top:8px;padding:14px 28px;background:#c9a84c;color:#0a0a0f;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;}
  .muted{font-size:11px;color:#555570;margin-top:24px;}
</style>
</head>
<body>
<div class="wrap">
  <h2>⛰ MOUNTAIN OF SUPREMACY</h2>
  ${bodyHtml}
  <p class="muted">If you didn't request this, you can safely ignore this email.</p>
</div>
</body>
</html>`;
}

export async function sendVerificationEmail(to: string, username: string, token: string): Promise<void> {
  const domain = getAppDomain();
  const link = `https://${domain}/api/auth/verify-email?token=${token}`;
  const html = emailHtml("Verify your email", `
    <p>Welcome, <strong>${username}</strong>! Click the button below to verify your email address and start your journey.</p>
    <a class="btn" href="${link}">VERIFY EMAIL</a>
    <p style="margin-top:20px;font-size:12px;color:#555570;">Or copy this link:<br/>${link}</p>
    <p style="font-size:12px;color:#555570;">This link expires in 24 hours.</p>
  `);
  await sendEmail(to, "Verify your Mountain of Supremacy account", html);
}

export async function sendPasswordResetEmail(to: string, username: string, token: string): Promise<void> {
  const domain = getAppDomain();
  const link = `https://${domain}/api/auth/reset-password?token=${token}`;
  const html = emailHtml("Reset your password", `
    <p>Hi <strong>${username}</strong>, we received a request to reset your password.</p>
    <a class="btn" href="${link}">RESET PASSWORD</a>
    <p style="margin-top:20px;font-size:12px;color:#555570;">Or copy this link:<br/>${link}</p>
    <p style="font-size:12px;color:#555570;">This link expires in 1 hour.</p>
  `);
  await sendEmail(to, "Reset your Mountain of Supremacy password", html);
}
