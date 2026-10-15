# Boilerplate (electronrouterdbm)

## Electron API

Beispiele und Erweiterung des IPC-Routers: [Electron API](docs/electron-api.md).
Start: `npm run dev -- -m electron`, anschließend in der App `#/api` öffnen.

## Electron-Datenbanken

[PGlite, SQLite-Fallback und Drizzle-Migrationen](docs/database.md):
PGlite als primäre Datenbank, SQLite nur bei Öffnungsfehlern, eingebundene
Migrationen und geordnetes Beenden. Die API-Beispielseite enthält persistente Notizen.

## Install the dependencies

```bash
pnpm install
# or: yarn/npm/bun install
```

### Start the app in development mode (HMR, error reporting, etc.)

```bash
quasar dev
```

### Format & Lint the files

```bash
pnpm run lint
# or: yarn/npm/bun run lint
```

...or just check formatting & linting:

```bash
pnpm run lint:check
# or: yarn/npm/bun run lint:check
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-file).
