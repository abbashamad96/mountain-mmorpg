import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/stripe/products", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.metadata as product_metadata,
        pr.id as price_id,
        pr.unit_amount,
        pr.currency
      FROM stripe.products p
      JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY pr.unit_amount ASC
    `);

    const products = result.rows.map((row: any) => ({
      productId: row.product_id,
      name: row.product_name,
      description: row.product_description,
      rubies: Number(row.product_metadata?.rubies ?? 0),
      priceId: row.price_id,
      unitAmount: Number(row.unit_amount),
      currency: row.currency,
    }));

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
      sql`SELECT stripe_customer_id FROM users WHERE username_lower = ${usernameLower}`
    );

    let customerId: string | undefined =
      (existing.rows[0] as any)?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { username: usernameLower },
      });
      customerId = customer.id;
      await db.execute(
        sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE username_lower = ${usernameLower}`
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
      const priceId = session.line_items?.data?.[0]?.price?.id;

      if (priceId) {
        const priceRow = await db.execute(
          sql`SELECT metadata FROM stripe.prices WHERE id = ${priceId}`
        );
        const productId = (session.line_items?.data?.[0]?.price as any)?.product?.id;
        let rubies = 0;

        if (productId) {
          const productRow = await db.execute(
            sql`SELECT metadata FROM stripe.products WHERE id = ${productId}`
          );
          rubies = Number((productRow.rows[0] as any)?.metadata?.rubies ?? 0);
        }

        if (rubies > 0) {
          const usernameLower = username.toLowerCase();
          const userRow = await db.execute(
            sql`SELECT game_state FROM users WHERE username_lower = ${usernameLower}`
          );
          const gameState = (userRow.rows[0] as any)?.game_state as any;
          if (gameState) {
            const currentRubies = Number(gameState.character?.rubies ?? 0);
            const newRubies = currentRubies + rubies;
            gameState.character = {
              ...gameState.character,
              rubies: newRubies,
            };
            await db.execute(
              sql`UPDATE users SET game_state = ${JSON.stringify(gameState)}::jsonb WHERE username_lower = ${usernameLower}`
            );
            logger.info({ username: usernameLower, rubies, newRubies }, "Ruby purchase credited");
          }
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
