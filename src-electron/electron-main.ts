import { BrowserWindow, app, dialog, ipcMain } from "electron";
import { DatabaseManager } from "./database/manager";
import { registerDatabaseShutdown } from "./database/shutdown";
import { routeRequest } from "./api-router";
import path from "node:path";
import os from "node:os";
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from "#q-app/electron/main";

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

const database = new DatabaseManager({
  dataDirectory: path.join(app.getPath("userData"), "databases"),
  migrationsDirectory: resolveElectronAssetsPath("migrations"),
  onFallback(error) {
    console.error("PGlite konnte nicht geöffnet werden:", error);
    dialog.showErrorBox(
      "SQLite-Fallback",
      "PGlite ist nicht verfügbar. Es wird ein getrennter SQLite-Datenbestand verwendet. PostgreSQL-Daten werden nicht übernommen. Details stehen im Main-Prozess-Log."
    );
  }
});

registerDatabaseShutdown(
  app,
  () => database.close(),
  error => {
    console.error("Datenbank konnte nicht geschlossen werden:", error);
    dialog.showErrorBox("Datenbankfehler beim Beenden", String(error));
  }
);

async function createWindow() {
  /**
   * Initial window options
   */
  const mainWindow = new BrowserWindow({
    icon: resolveElectronAssetsPath("icons/icon.png"), // Windows and Linux
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.join(import.meta.dirname, "electron-preload.cjs")
    }
  });

  mainWindow.webContents.on("will-navigate", event => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  // Windows kann bei Abmeldung before-quit überspringen. Frühzeitig schließen.
  mainWindow.on("query-session-end", event => {
    event.preventDefault();
    app.quit();
  });

  if (import.meta.env.QUASAR_DEV) {
    await mainWindow.loadURL(import.meta.env.QUASAR_APP_URL);
  } else {
    await mainWindow.loadFile("index.html");
  }

  if (import.meta.env.QUASAR_DEBUG) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow?.webContents.closeDevTools();
    });
  }
}

if (hasLock)
  void app
    .whenReady()
    .then(async () => {
      registerQuasarRuntime();
      await database.start();
      if (database.status().stopping) return;
      ipcMain.handle("api:request", (event, request: unknown) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window || event.senderFrame !== window.webContents.mainFrame) {
          return { status: 403, data: { error: "Zugriff verweigert." } };
        }
        if (database.status().stopping) {
          return { status: 503, data: { error: "Anwendung wird beendet." } };
        }
        return routeRequest(request, database);
      });
      void createWindow();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          void createWindow();
        }
      });
    })
    .catch(error => {
      console.error("Datenbankstart fehlgeschlagen:", error);
      dialog.showErrorBox("Datenbankstart fehlgeschlagen", String(error));
      app.quit();
    });

app.on("window-all-closed", () => {
  if (platform !== "darwin") {
    app.quit();
  }
});
