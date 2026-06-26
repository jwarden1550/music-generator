import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull().default(10),
  model: text("model").notNull().default("facebook/musicgen-small"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
