import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/stripe/products", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const [productsResp, pricesResp] = await Promise.all([
      stripe.products.list({ active: true, limit: 20 }),
      stripe.prices.list({ active: true, limit: 20 }),
    ]);

    const pricesByProduct = new Map<string, (typeof pricesResp.data)[0]>();
    for (const price of pricesResp.data) {
      const productId =
        typeof price.product === "string" ? price.product : price.product.id;
      if (!pricesByProduct.has(productId)) {
        pricesByProduct.set(productId, price);
      }
    }

    const products = productsResp.data
      .filter((p) => {
        const rubies = Number(p.metadata?.rubies ?? 0);
        return rubies > 0 && pricesByProduct.has(p.id);
      })
      .map((p) => {
        const price = pricesByProduct.get(p.id)!;
        return {
          productId: p.id,
          name: p.name,
          description: p.description ?? "",
          rubies: Number(p.metadata?.rubies ?? 0),
          priceId: price.id,
          unitAmount: price.unit_amount ?? 0,
          currency: price.currency,
        };
      })
      .sort((a, b) => a.unitAmount - b.unitAmount);

    res.json({ products });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ruby products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/stripe/checkout", async (req, res) => {
  try {
    const { priceId, username } = req.body as {
      priceId: string;
      username: string;
    };

    if (!priceId || !username) {
      return res.status(400).json({ error: "priceId and username required" });
    }

    const stripe = await getUncachableStripeClient();
    const usernameLower = username.toLowerCase();

    const existing = await db.execute(
      sql`SELECT stripe_customer_id FROM users WHERE username_lower = ${usernameLower}`,
    );

    let customerId: string | undefined =
      (existing.rows[0] as any)?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { username: usernameLower },
      });
      customerId = customer.id;
      await db.execute(
        sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE username_lower = ${usernameLower}`,
      );
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&username=${encodeURIComponent(usernameLower)}`,
      cancel_url: `${baseUrl}/`,
      metadata: { username: usernameLower },
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/stripe/success", async (req, res) => {
  try {
    const { session_id, username } = req.query as {
      session_id: string;
      username: string;
    };

    if (!session_id || !username) {
      return res.redirect("/");
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items.data.price.product"],
    });

    if (session.payment_status === "paid") {
      const lineItem = session.line_items?.data?.[0];
      let rubies = 0;

      if (lineItem?.price) {
        const productId =
          typeof lineItem.price.product === "string"
            ? lineItem.price.product
            : (lineItem.price.product as any)?.id;

        if (productId) {
          const product = await stripe.products.retrieve(productId);
          rubies = Number(product.metadata?.rubies ?? 0);
        }
      }

      if (rubies > 0) {
        const usernameLower = username.toLowerCase();
        const userRow = await db.execute(
          sql`SELECT game_state FROM users WHERE username_lower = ${usernameLower}`,
        );
        const gameState = (userRow.rows[0] as any)?.game_state as any;
        if (gameState) {
          const currentRubies = Number(gameState.character?.rubies ?? 0);
          const newRubies = currentRubies + rubies;
          gameState.character = { ...gameState.character, rubies: newRubies };
          await db.execute(
            sql`UPDATE users SET game_state = ${JSON.stringify(gameState)}::jsonb WHERE username_lower = ${usernameLower}`,
          );
          logger.info(
            { username: usernameLower, rubies, newRubies },
            "Ruby purchase credited",
          );
        }
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Complete</title>
          <meta charset="utf-8" />
          <style>
            body { background: #0d0d14; color: #e0e0e0; font-family: sans-serif;
                   display: flex; flex-direction: column; align-items: center;
                   justify-content: center; height: 100vh; margin: 0; gap: 16px; }
            h1 { color: #E91E8C; font-size: 28px; margin: 0; }
            p { color: #aaa; margin: 0; font-size: 15px; }
            a { color: #E91E8C; text-decoration: none; font-size: 14px; margin-top: 8px; }
          </style>
          <script>
            setTimeout(() => { window.location.href = '/'; }, 4000);
          </script>
        </head>
        <body>
          <h1>◆ Rubies Added!</h1>
          <p>Your rubies have been credited to your account.</p>
          <p>Returning to the game in a few seconds…</p>
          <a href="/">Go back now</a>
        </body>
      </html>
    `);
  } catch (err) {
    logger.error({ err }, "Failed to process purchase success");
    res.redirect("/");
  }
});

export default router;
