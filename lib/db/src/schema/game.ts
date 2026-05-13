import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  usernameLower: text("username_lower").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationTokenExpires: bigint("verification_token_expires", { mode: "number" }),
  resetToken: text("reset_token"),
  resetTokenExpires: bigint("reset_token_expires", { mode: "number" }),
  gameState: jsonb("game_state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionsTable = pgTable("sessions", {
  token: text("token").primaryKey(),
  usernameLower: text("username_lower").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auctionListingsTable = pgTable("auction_listings", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull(),
  sellerName: text("seller_name").notNull(),
  material: jsonb("material")
    .$type<{ type: string; rarity: string; version: number }>()
    .notNull(),
  count: integer("count").notNull(),
  price: integer("price").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const buyOrdersTable = pgTable("buy_orders", {
  id: text("id").primaryKey(),
  buyerId: text("buyer_id").notNull(),
  buyerName: text("buyer_name").notNull(),
  material: jsonb("material")
    .$type<{ type: string; rarity: string; version: number | null }>()
    .notNull(),
  count: integer("count").notNull(),
  filled: integer("filled").notNull().default(0),
  pricePerUnit: integer("price_per_unit").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const pendingDeliveriesTable = pgTable("pending_deliveries", {
  id: serial("id").primaryKey(),
  usernameLower: text("username_lower").notNull(),
  deliveryType: text("delivery_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
