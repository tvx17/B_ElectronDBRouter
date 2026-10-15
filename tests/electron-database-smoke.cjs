// Runs inside a real Electron main process, without opening a window.
require("tsx/cjs");
const { app } = require("electron");
app.disableHardwareAcceleration();
app.setPath("userData", process.env.DB_SMOKE_PROFILE);
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseManager } = require("../src-electron/database/manager.ts");
const {
  registerDatabaseShutdown
} = require("../src-electron/database/shutdown.ts");

const provider = process.argv[2] ?? "pglite";
const migrationsDirectory = path.resolve(
  __dirname,
  "../src-electron/electron-assets/migrations"
);
const timeout = setTimeout(() => {
  console.error("Electron database test timed out");
  app.exit(1);
}, 60000);

void app
  .whenReady()
  .then(async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "electron-db-smoke-")
    );
    const options = {
      dataDirectory: directory,
      migrationsDirectory,
      onFallback: error => {
        throw error;
      },
      connectPrimary: async filename => {
        if (provider === "sqlite") {
          const {
            connectSqlite
          } = require("../src-electron/database/sqlite.ts");
          return connectSqlite(`${filename}.sqlite`);
        }
        const { connectPglite } = require("../src-electron/database/pglite.ts");
        return connectPglite(filename);
      }
    };
    const manager = new DatabaseManager(options);
    let write;
    registerDatabaseShutdown(
      app,
      async () => {
        await manager.close();
        await write;
        const reopened = new DatabaseManager(options);
        try {
          await reopened.start();
          const notes = await reopened.listNotes();
          assert.equal(notes.length, 1);
          assert.equal(notes[0].title, "Saved during immediate Electron quit");
          assert.equal(reopened.status().provider, provider);
        } finally {
          await reopened.close();
          await fs.rm(directory, { recursive: true, force: true });
        }
        clearTimeout(timeout);
        console.log(
          `PASS: ${provider} Electron quit waits for startup, migrations and write; reopen succeeds`
        );
      },
      error => console.error(error)
    );
    // Quit immediately while initialization/migrations and the write are outstanding.
    write = manager.addNote("Saved during immediate Electron quit");
    void write.catch(error => console.error(error));
    app.quit();
  })
  .catch(error => {
    console.error(error);
    app.exit(1);
  });
