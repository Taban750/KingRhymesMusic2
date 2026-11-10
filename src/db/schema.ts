import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  numeric,
  jsonb,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: varchar("display_name", { length: 120 }).notNull().default("Fan"),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 20 }).notNull().default("fan"),
  provider: varchar("provider", { length: 20 }).notNull().default("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  coverUrl: text("cover_url"),
  audioFullPath: text("audio_full_path"),
  audioPreviewPath: text("audio_preview_path"),
  description: text("description"),
  lyrics: text("lyrics"),
  genre: varchar("genre", { length: 80 }).notNull().default("Hip-Hop / Dancehall Fusion"),
  releaseDate: timestamp("release_date").defaultNow(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull().default("1.99"),
  isFree: boolean("is_free").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  playCount: integer("play_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  coverUrl: text("cover_url"),
  archivePath: text("archive_path"),
  previewPath: text("preview_path"),
  description: text("description"),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull().default("9.99"),
  isFree: boolean("is_free").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaVideos = pgTable("media_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  coverUrl: text("cover_url"),
  videoFullPath: text("video_full_path"),
  videoPreviewPath: text("video_preview_path"),
  description: text("description"),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull().default("1.99"),
  isFree: boolean("is_free").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const merchProducts = pgTable("merch_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  category: varchar("category", { length: 30 }).notNull(),
  imageUrl: text("image_url").notNull(),
  galleryUrls: jsonb("gallery_urls").$type<string[]>().notNull().default([]),
  description: text("description"),
  availableSizes: jsonb("available_sizes").$type<string[]>().notNull().default(["One size"]),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  songId: uuid("song_id").references(() => songs.id, { onDelete: "cascade" }),
  albumId: uuid("album_id").references(() => albums.id, { onDelete: "restrict" }),
  videoId: uuid("video_id").references(() => mediaVideos.id, { onDelete: "restrict" }),
  merchProductId: uuid("merch_product_id").references(() => merchProducts.id, { onDelete: "restrict" }),
  merchSize: varchar("merch_size", { length: 40 }),
  shippingName: varchar("shipping_name", { length: 160 }),
  shippingPhone: varchar("shipping_phone", { length: 40 }),
  shippingAddress: text("shipping_address"),
  fulfillmentStatus: varchar("fulfillment_status", { length: 30 }).notNull().default("not_applicable"),
  buyerEmail: varchar("buyer_email", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  provider: varchar("provider", { length: 30 }).notNull().default("flutterwave"),
  providerRef: varchar("provider_ref", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const donations = pgTable("donations", {
  id: uuid("id").primaryKey().defaultRandom(),
  donorName: varchar("donor_name", { length: 120 }).notNull().default("Anonymous"),
  donorEmail: varchar("donor_email", { length: 255 }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  provider: varchar("provider", { length: 30 }).notNull().default("flutterwave"),
  providerRef: varchar("provider_ref", { length: 255 }),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  songId: uuid("song_id")
    .references(() => songs.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  authorName: varchar("author_name", { length: 120 }).notNull().default("Fan"),
  authorAvatar: text("author_avatar"),
  isArtistReply: boolean("is_artist_reply").notNull().default(false),
  body: text("body").notNull(),
  isApproved: boolean("is_approved").notNull().default(true),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    songId: uuid("song_id")
      .references(() => songs.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("ratings_song_user_unique").on(t.songId, t.userId)]
);

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  artistName: varchar("artist_name", { length: 120 }).notNull().default("KING RHYMES"),
  tagline: varchar("tagline", { length: 255 }).notNull().default("Where Rhymes Reign"),
  heroText: text("hero_text").notNull().default("Ugandan hip-hop / dancehall fusion with street-culture swagger. Stream previews free, own the full masters."),
  bio: text("bio").notNull().default("King Rhymes is an independent Ugandan hip-hop / dancehall fusion artist from Kampala. Where Rhymes Reign."),
  heroImageUrl: text("hero_image_url"),
  featuredSongId: uuid("featured_song_id"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>().default({}),
  streamingLinks: jsonb("streaming_links").$type<Record<string, string>>().default({}),
  paymentMethods: jsonb("payment_methods").$type<string[]>().default(["flutterwave"]),
  currencies: jsonb("currencies").$type<string[]>().default(["USD", "UGX", "KES", "NGN", "GBP", "EUR"]),
  approvalRequired: boolean("approval_required").notNull().default(false),
  pressKitUrl: text("press_kit_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  type: varchar("type", { length: 60 }).notNull().default("Booking"),
  message: text("message").notNull(),
  eventDate: varchar("event_date", { length: 60 }),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  year: varchar("year", { length: 10 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtubeId: varchar("youtube_id", { length: 30 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pressItems = pgTable("press_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  outlet: varchar("outlet", { length: 120 }).notNull(),
  quote: text("quote").notNull(),
  author: varchar("author", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const visitors = pgTable("visitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: varchar("path", { length: 255 }).notNull(),
  userAgent: text("user_agent"),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
