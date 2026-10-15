import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Database, Note } from "./contracts";

interface Connection {
  database: Database;
  migrate(folder: string): void | Promise<void>;
}

export interface DatabaseOptions {
  dataDirectory: string;
  migrationsDirectory: string;
  onFallback(error: unknown): void;
  connectPrimary?: (directory: string) => Promise<Connection>;
  connectFallback?: (filename: string) => Promise<Connection>;
}

export class DatabaseManager {
  private opening: Promise<Database> | undefined;
  private closing: Promise<void> | undefined;
  private stopping = false;
  private pending = new Set<Promise<unknown>>();
  private provider: Database["provider"] | undefined;

  constructor(private readonly options: DatabaseOptions) {}

  start(): Promise<Database> {
    if (this.stopping)
      return Promise.reject(new Error("Datenbank wird beendet."));
    this.opening ??= this.open();
    return this.opening;
  }

  private async open(): Promise<Database> {
    await mkdir(this.options.dataDirectory, { recursive: true });
    const primary =
      this.options.connectPrimary ??
      (async directory => {
        const { connectPglite } = await import("./pglite");
        return connectPglite(directory);
      });
    const fallback =
      this.options.connectFallback ??
      (async filename => {
        const { connectSqlite } = await import("./sqlite");
        return connectSqlite(filename);
      });
    let connection: Connection;
    try {
      connection = await primary(
        path.join(this.options.dataDirectory, "pglite")
      );
    } catch (error) {
      this.options.onFallback(error);
      connection = await fallback(
        path.join(this.options.dataDirectory, "fallback.sqlite")
      );
    }
    try {
      // Migrationsfehler dürfen keinen stillen Wechsel des Datenbestands auslösen.
      await connection.migrate(
        path.join(
          this.options.migrationsDirectory,
          connection.database.provider
        )
      );
      this.provider = connection.database.provider;
      return connection.database;
    } catch (error) {
      await connection.database.close();
      throw error;
    }
  }

  status() {
    return {
      provider: this.provider ?? null,
      fallback: this.provider === "sqlite",
      stopping: this.stopping
    };
  }

  private run<T>(operation: (database: Database) => Promise<T>): Promise<T> {
    if (this.stopping)
      return Promise.reject(new Error("Datenbank wird beendet."));
    const task = this.start().then(operation);
    this.pending.add(task);
    void task.then(
      () => this.pending.delete(task),
      () => this.pending.delete(task)
    );
    return task;
  }

  listNotes(): Promise<Note[]> {
    return this.run(database => database.listNotes());
  }

  addNote(title: string): Promise<Note> {
    return this.run(database => database.addNote(title));
  }

  close(): Promise<void> {
    this.stopping = true;
    this.closing ??= (async () => {
      // Auch ein sofortiges Beenden während Initialisierung/Migration abfangen.
      const database = await this.opening?.catch(() => undefined);
      await Promise.allSettled(this.pending);
      await database?.close();
    })();
    return this.closing;
  }
}
