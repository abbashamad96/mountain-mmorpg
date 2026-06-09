import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

  async function getStripeCredentials(): Promise<{
    secretKey: string;
    webhookSecret?: string;
  }> {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;

    // 1. Render Fallback: If a key is provided in settings, use it
    if (process.env.STRIPE_SECRET_KEY) {
      return {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
      };
    }

    // 2. Safe Fallback: If no Replit or Render keys exist, log a warning and return empty keys instead of crashing
    if (!hostname || !xReplitToken) {
      console.warn("⚠️ Running in production outside of Replit. Stripe payments are disabled.");
      return { secretKey: "mock_key", webhookSecret: "" };
    }

    const resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
      {
        headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!resp.ok) {
      console.warn("⚠️ Failed to fetch Replit Stripe credentials. Using placeholder keys.");
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
  }


  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = await resp.json();
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret) {
    throw new Error(
      "Stripe integration not connected or missing secret key. " +
        "Connect Stripe via the Integrations tab first.",
    );
  }

  return {
    secretKey: settings.secret,
    webhookSecret: settings.webhook_secret,
  };
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
