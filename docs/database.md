# Datenbanken in Electron

Drizzle läuft ausschließlich im Electron-Main-Prozess. Primär wird immer
PostgreSQL über PGlite verwendet. Ein separater PostgreSQL-Dienst ist nicht nötig.
SQLite mit Drizzle und `better-sqlite3` dient nur als Fallback, wenn PGlite nicht
geöffnet werden kann. Ein Dialog und `GET /database` zeigen den Fallback an.
Bei einem Migrationsfehler bricht der Start ab, ohne zu SQLite zu wechseln.

## Installation und Start

```powershell
npm install
npm install --prefix src-electron
npm run dev -- -m electron
```

In der Anwendung die Route `#/api` öffnen. „Notiz speichern“, „Notizen laden“
und „Datenbankstatus“ zeigen die Anbindung an die vorhandene IPC-API.

```typescript
import { request } from "@/services/electron-api";

await request({ method: "POST", url: "/notes", data: { title: "Hallo" } });
const notes = await request({ method: "GET", url: "/notes" });
const status = await request({ method: "GET", url: "/database" });
```

`notes.data.items` enthält die gespeicherten Notizen. `status.data` enthält
`provider`, `fallback` und `stopping`. Weitere Operationen können in
`src-electron/api-router.ts` und den Datenbankadaptern ergänzt werden.

## Speicherorte und Fallback

- PGlite: `<app.getPath("userData")>/databases/pglite/`
- SQLite: `<app.getPath("userData")>/databases/fallback.sqlite`

Die tatsächliche Basis hängt von Betriebssystem und App-Namen ab. Die Anwendung
erzwingt eine einzelne Instanz. Die Datenverzeichnisse liegen außerhalb des
Installationsordners und bleiben bei Updates erhalten.

Beide Anbieter haben unabhängige Datenbestände. Es gibt keine automatische
Übernahme, Synchronisation oder Rückübertragung. Bei jedem neuen Start wird
wieder zuerst PGlite versucht. Während des Betriebs erfolgt kein automatischer
Wechsel bei Abfragefehlern. Vor produktiven Schemaänderungen die Anwendung
schließen und das gesamte jeweilige Datenverzeichnis sichern.

## Eingebundene Migrationen mit Drizzle Kit

Schemas stehen in `src-electron/database/schema-pg.ts` und `schema-sqlite.ts`.
Änderungen für beide Dialekte pflegen und Migrationen erzeugen:

```powershell
npm run db:generate:pglite
npm run db:generate:sqlite
```

Generierte SQL-Dateien, Journale und Snapshots unter
`src-electron/electron-assets/migrations/` gemeinsam committen. Bestehende
ausgelieferte Migrationen nicht ändern. Quasar kopiert diese Assets in den
Electron-Build. Vor dem Öffnen des Fensters führt der jeweilige Drizzle-Migrator
nur ausstehende Migrationen aus. Drizzle Kit wird nur zur Entwicklung gebraucht;
zur Laufzeit benötigt die Anwendung keine CLI und keinen Netzwerkzugang.

```powershell
npm run build -- -m electron
```

Für einen Build ohne Installer/Anwendungspaket:
`npx quasar build -m electron --skip-pkg`.
`better-sqlite3` ist eine plattformspezifische Laufzeitabhängigkeit. Installation
und Paketierung auf der Zielplattform prüfen; der Electron-Prozesstest prüft die
Kompatibilität mit der lokal installierten Electron-Version.

## Geordnetes Beenden

Der gemeinsame Shutdown-Handler hält `before-quit` an, sperrt neue Operationen,
wartet auf Initialisierung, Migrationen und laufende Datenbankoperationen und
ruft anschließend `PGlite.close()` beziehungsweise SQLite `close()` auf. Erst
danach wird Electron beendet. Wiederholte Quit-Anfragen teilen denselben
Schließvorgang. SIGINT/SIGTERM und Windows `query-session-end` werden ebenfalls
behandelt. Es gibt keinen Timeout, der eine noch aktive Datenbank gewaltsam beendet.

PGlite nutzt `relaxedDurability: false`; SQLite nutzt WAL und `synchronous=FULL`.
Ein hartes Prozessende, Task-Manager-Abschuss, Stromausfall oder vom Betriebssystem
erzwungener Shutdown lässt keine zuverlässige asynchrone Abschlussarbeit zu.
`process.exit()` und `app.exit()` im eigenen Anwendungscode daher vermeiden.
Nur bei einem Fehler des geordneten Schließens wird mit Fehlercode 1 beendet.

## Prüfungen

```powershell
npm run test:database
npm run test:database:electron
node --experimental-strip-types --test tests/electron-api.test.mjs
npm run lint:check
npm run typecheck
npm run build
```

Die Datenbanktests verwenden temporäre Dateien: Migrationen, Persistenz nach
Neustart, Fallback, Migrationsfehler und ausstehende Schreiboperationen beim Quit.
Der zweite Befehl startet echte Electron-Prozesse ohne Fenster für beide Adapter
und prüft sofortiges Quit während des Starts sowie erneutes Öffnen der Daten.

Referenzen: [Drizzle mit PGlite](https://orm.drizzle.team/docs/get-started/pglite-new),
[Drizzle-Migrationen](https://orm.drizzle.team/docs/migrations),
[PGlite-API](https://pglite.dev/docs/api),
[Electron App-Lebenszyklus](https://www.electronjs.org/docs/latest/api/app).
