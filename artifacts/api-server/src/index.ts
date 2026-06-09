import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { attachWebSocketServer } from "./lib/websocket";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe init");
    return;
  }

  // FORCE BYPASS ON RENDER: Skip if no real Stripe Secret Key is present
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "mock_key") {
    logger.warn("⚠️ Running outside of Replit with no valid STRIPE_SECRET_KEY. Skipping Stripe sync entirely.");
    return;
  }

  try {
    await runMigrations({ databaseUrl, schema: "stripe" });
    const stripeSync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    stripeSync.syncBackfill().catch((err: unknown) => 
      logger.error({ err }, "Stripe backfill error")
    );
    logger.info("Stripe initialized");
  } catch (err) {
    logger.error({ err }, "Stripe init failed — payments unavailable");
  }
}


const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initStripe();

const server = http.createServer(app);

attachWebSocketServer(server).then(() => {
  server.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error({ err }, "Failed to attach WebSocket server");
  process.exit(1);
});
