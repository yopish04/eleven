import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const worlds = sqliteTable('worlds', {
  owner: text('owner').primaryKey(), runId: text('run_id').notNull(),
  version: integer('version').notNull().default(0), mutation: text('mutation').notNull(),
  payload: text('payload').notNull(), updatedAt: integer('updated_at').notNull(),
});
export const matches = sqliteTable('matches', {
  owner: text('owner').notNull(), runId: text('run_id').notNull(),
  fixtureId: text('fixture_id').notNull(), payload: text('payload').notNull(),
}, t => [primaryKey({columns:[t.owner,t.runId,t.fixtureId]})]);
