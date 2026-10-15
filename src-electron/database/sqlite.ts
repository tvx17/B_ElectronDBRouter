import SQLite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { randomUUID } from "node:crypto";
import { notes } from "./schema-sqlite";
import type { Database } from "./contracts";

export function connectSqlite(filename: string) {
  const client = new SQLite(filename);
  try {
    client.pragma("journal_mode = WAL");
    client.pragma("synchronous = FULL");
    client.pragma("foreign_keys = ON");
  } catch (error) {
    client.close();
    throw error;
  }
  const db = drizzle(client);
  const database: Database = {
    provider: "sqlite",
    listNotes: () => Promise.resolve(db.select().from(notes).orderBy(notes.id).all()),
    async addNote(title) {
      const note = { id: randomUUID(), title };
      db.insert(notes).values(note).run();
      return note;
    },
    close() {
      if (client.open) client.close();
      return Promise.resolve();
    }
  };
  return {
    database,
    migrate: (migrationsFolder: string) => migrate(db, { migrationsFolder })
  };
}
