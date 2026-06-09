import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";

const app: Express = express();

// Stripe webhook MUST be registered before express.json() to get raw Buffer
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
import path from "path";
import { Request, Response } from "express";

// 1. Step out 3 levels to reach the root directory
// process.cwd() gets the exact repository root where your project builds are executing
// Hard escape: __dirname is inside src/ -> api-server/ -> artifacts/. 3 steps back gets to the absolute root.
const clientDistPath = path.join(__dirname, "../../../mountain-game/web-build");



app.use(express.static(clientDistPath));

// 2. Explicitly type req and res to pass strict tsc checks
// Change this line at the bottom of app.ts:
// This middleware catches any requests that didn't match the /api routes above
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});



export default app;
