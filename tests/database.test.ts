import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { connectPglite } from "../src-electron/database/pglite";
import { connectSqlite } from "../src-electron/database/sqlite";
import { DatabaseManager } from "../src-electron/database/manager";
import { routeRequest } from "../src-electron/api-router";

const migrationsDirectory = path.resolve(
  "src-electron/electron-assets/migrations"
);

for (const provider of ["pglite", "sqlite"] as const) {
  void test(`${provider}: Migrationen, IPC-Router, Persistenz und erneuter Start`, async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), `electron-${provider}-`)
    );
    const connect = () =>
      provider === "pglite"
        ? connectPglite(path.join(directory, "pg"))
        : Promise.resolve(connectSqlite(path.join(directory, "test.sqlite")));
    try {
      for (let iteration = 0; iteration < 2; iteration++) {
        const manager = new DatabaseManager({
          dataDirectory: directory,
          migrationsDirectory,
          connectPrimary: connect,
          onFallback: error => {
            throw error;
          }
        });
        try {
          await manager.start();
          assert.equal(manager.status().provider, provider);
          if (iteration === 0) {
            const response = await routeRequest(
              {
                method: "POST",
                url: "/notes",
                data: { title: "Persistente Notiz" }
              },
              manager
            );
            assert.equal(response.status, 201);
          }
          const items = await manager.listNotes();
          assert.equal(items.length, 1);
          assert.equal(items[0]?.title, "Persistente Notiz");
          const response = await routeRequest(
            { method: "GET", url: "/database" },
            manager
          );
          assert.equal(response.status, 200);
          assert.equal(
            (
              await routeRequest(
                { method: "POST", url: "/notes", data: { title: "" } },
                manager
              )
            ).status,
            400
          );
        } finally {
          await manager.close();
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

void test("PGlite-Öffnungsfehler aktiviert SQLite-Fallback", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "electron-fallback-"));
  let warned = false;
  const manager = new DatabaseManager({
    dataDirectory: directory,
    migrationsDirectory,
    connectPrimary: () => Promise.reject(new Error("PGlite unavailable")),
    onFallback: () => {
      warned = true;
    }
  });
  try {
    await manager.start();
    assert.equal(warned, true);
    assert.equal(manager.status().fallback, true);
    await manager.addNote("Fallback");
    assert.equal((await manager.listNotes()).length, 1);
  } finally {
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
});

void test("Migration scheitert: Verbindung schließen, kein Fallback", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "electron-migration-")
  );
  let closed = false;
  const manager = new DatabaseManager({
    dataDirectory: directory,
    migrationsDirectory,
    connectPrimary: () =>
      Promise.resolve({
        database: {
          provider: "pglite",
          listNotes: async () => [],
          addNote: async title => ({ id: "test", title }),
          close: async () => {
            closed = true;
          }
        },
        migrate: () => {
          throw new Error("migration failed");
        }
      }),
    onFallback: () => assert.fail("Kein Fallback bei Migrationsfehler")
  });
  try {
    await assert.rejects(manager.start(), /migration failed/);
    assert.equal(closed, true);
  } finally {
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
});

void test("Schnelles Beenden wartet auf Start und laufende Schreiboperation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "electron-quit-"));
  let finishWrite: (() => void) | undefined;
  let startedWrite: (() => void) | undefined;
  const started = new Promise<void>(resolve => {
    startedWrite = resolve;
  });
  const finished = new Promise<void>(resolve => {
    finishWrite = resolve;
  });
  let closed = false;
  const manager = new DatabaseManager({
    dataDirectory: directory,
    migrationsDirectory,
    connectPrimary: async () => ({
      database: {
        provider: "pglite",
        listNotes: async () => [],
        addNote: async title => {
          startedWrite?.();
          await finished;
          assert.equal(closed, false);
          return { id: "test", title };
        },
        close: async () => {
          closed = true;
        }
      },
      migrate: async () => undefined
    }),
    onFallback: error => {
      throw error;
    }
  });
  try {
    const write = manager.addNote("Vor Beenden speichern");
    const closing = manager.close();
    assert.equal(manager.close(), closing);
    await started;
    assert.equal(closed, false);
    await assert.rejects(manager.addNote("Zu spät"), /beendet/);
    finishWrite?.();
    await write;
    await closing;
    assert.equal(closed, true);
  } finally {
    finishWrite?.();
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
});
