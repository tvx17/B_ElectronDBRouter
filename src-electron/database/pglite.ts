import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { randomUUID } from "node:crypto";
import { notes } from "./schema-pg";
import type { Database } from "./contracts";

export async function connectPglite(directory: string) {
  const client = new PGlite(directory, { relaxedDurability: false });
  try {
    await client.waitReady;
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
  const db = drizzle(client);
  let closing: Promise<void> | undefined;
  const database: Database = {
    provider: "pglite",
    listNotes: () => db.select().from(notes).orderBy(notes.id),
    async addNote(title) {
      const note = { id: randomUUID(), title };
      await db.insert(notes).values(note);
      return note;
    },
    close() {
      closing ??= client.close();
      return closing;
    }
  };
  return {
    database,
    migrate: (migrationsFolder: string) => migrate(db, { migrationsFolder })
  };
}
