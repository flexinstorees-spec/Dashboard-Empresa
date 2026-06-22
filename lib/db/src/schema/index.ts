import { pgTable, text, serial, real, integer, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const syncLogsTable = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull(), // idle | syncing | success | error
  message: text("message").notNull().default(""),
  offersCount: integer("offers_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const offersTable = pgTable("offers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lastSyncAt: timestamp("last_sync_at").notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

export const dailyMetricsTable = pgTable("daily_metrics", {
  id: serial("id").primaryKey(),
  offerId: text("offer_id").notNull(), // "ALL" for consolidated, or offer id
  date: date("date").notNull(),
  revenue: real("revenue").notNull().default(0),
  profit: real("profit").notNull().default(0),
  expenses: real("expenses").notNull().default(0),
  sales: integer("sales").notNull().default(0),
  refunds: real("refunds").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSyncLogSchema = createInsertSchema(syncLogsTable).omit({ id: true, createdAt: true });
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogsTable.$inferSelect;

export const insertOfferSchema = createInsertSchema(offersTable).omit({ lastSyncAt: true });
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offersTable.$inferSelect;

export const insertDailyMetricSchema = createInsertSchema(dailyMetricsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyMetric = z.infer<typeof insertDailyMetricSchema>;
export type DailyMetric = typeof dailyMetricsTable.$inferSelect;

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
