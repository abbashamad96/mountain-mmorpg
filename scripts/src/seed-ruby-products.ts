import { getUncachableStripeClient } from "./stripeClient.js";

const RUBY_PACKS = [
  { name: "Ruby Pouch", rubies: 100, price: 99 },
  { name: "Ruby Sack", rubies: 500, price: 399 },
  { name: "Ruby Chest", rubies: 1200, price: 799 },
  { name: "Ruby Vault", rubies: 3000, price: 1699 },
];

async function seedRubyProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("Seeding ruby packs into Stripe...\n");

  for (const pack of RUBY_PACKS) {
    const existing = await stripe.products.search({
      query: `name:'${pack.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ ${pack.name} already exists (${existing.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name: pack.name,
      description: `${pack.rubies} Rubies for Mountain of Supremacy`,
      metadata: { rubies: String(pack.rubies) },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.price,
      currency: "usd",
    });

    console.log(
      `✓ Created ${pack.name}: ${pack.rubies} rubies @ $${(pack.price / 100).toFixed(2)} — product: ${product.id}, price: ${price.id}`,
    );
  }

  console.log("\nDone! Webhooks will sync to DB automatically.");
}

seedRubyProducts().catch((err) => {
  console.error(err);
  process.exit(1);
});
