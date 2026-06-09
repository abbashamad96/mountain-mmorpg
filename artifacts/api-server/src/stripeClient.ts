import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
const xReplitToken = process.env.REPL_IDENTITY
  ? "repl " + process.env.REPL_IDENTITY
  : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

async function getStripeCredentials(): Promise<{
  secretKey: string;
  webhookSecret?: string;
}> {
  // 1. Render Fallback
  if (process.env.STRIPE_SECRET_KEY) {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
    };
  }

  // 2. Production Fallback (Bypass checks on Render)
  if (!hostname || !xReplitToken) {
    console.warn("⚠️ Production mode outside of Replit. Stripe disabled.");
    return { secretKey: "mock_key", webhookSecret: "" };
  }

  try {
    const resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
      {
        headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!resp.ok) {
      return { secretKey: "mock_key", webhookSecret: "" };
    }

    const data = await resp.json();
    const settings = data.items?.[0]?.settings;

    if (!settings?.secret) {
      return { secretKey: "mock_key", webhookSecret: "" };
    }

    return {
      secretKey: settings.secret,
      webhookSecret: settings.webhook_secret,
    };
  } catch {
    return { secretKey: "mock_key", webhookSecret: "" };
  }
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? "",
  });
}
