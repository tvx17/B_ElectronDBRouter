import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src-electron/database/schema-sqlite.ts",
  out: "./src-electron/migrations/sqlite"
});
