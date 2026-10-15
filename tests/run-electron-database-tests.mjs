import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const electron = require("../src-electron/node_modules/electron");
const directory = mkdtempSync(path.join(os.tmpdir(), "electron-db-profiles-"));
try {
  for (const provider of ["pglite", "sqlite"]) {
    const profile = path.join(directory, provider);
    mkdirSync(profile);
    const environment = { ...process.env, DB_SMOKE_PROFILE: profile };
    delete environment.ELECTRON_RUN_AS_NODE;
    const result = spawnSync(
      electron,
      ["tests/electron-database-smoke.cjs", provider],
      {
        cwd: root,
        env: environment,
        encoding: "utf8",
        timeout: 90000,
        windowsHide: true
      }
    );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (
      result.error ||
      result.status !== 0 ||
      !result.stdout.includes(`PASS: ${provider}`)
    ) {
      throw (
        result.error ??
        new Error(`Electron ${provider} failed: ${result.status}`)
      );
    }
  }
} finally {
  rmSync(directory, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200
  });
}
