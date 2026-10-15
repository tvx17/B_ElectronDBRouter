import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src-electron/database/schema-pg.ts",
  out: "./src-electron/migrations/pglite"
});
