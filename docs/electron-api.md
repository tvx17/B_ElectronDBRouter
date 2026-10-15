# Electron API

Start: `npm run dev -- -m electron`. In der Anwendung die Hash-Route
`#/api` öffnen. Sie enthält ausführbare GET-, POST-, PUT-, PATCH-, DELETE-
und Fehlerbeispiele. Alternativ im Frontend:

```typescript
import { request } from "@/services/electron-api";

const user = await request({ method: "GET", url: "/users/42?details=true" });
const created = await request({
  method: "POST",
  url: "/users",
  data: { name: "Ada", preferences: { language: "de" } }
});
console.log(user.status, created.data);
```

URLs sind relative API-Pfade. Pfadparameter werden dekodiert, Query-Parameter
über `URL.searchParams` gelesen. Parameterwerte mit `encodeURIComponent` kodieren.
Die Antwort enthält `status` und JSON-kompatible `data`. Fehlerstatus wie 400,
404 und 405 werden ebenfalls als Antworten geliefert; Transportfehler und die
Verwendung im normalen Browser führen zu einer abgelehnten Promise.

## Eigene Verarbeitung

In `src-electron/api-router.ts` im äußeren `switch (resource)` eigene Ressourcen
ergänzen und im inneren `switch (method)` die Methoden implementieren. `id`
enthält das zweite Pfadsegment, `data` die JSON-Nutzlast. Für komplexere Pfade
`segments` verwenden und die Prüfung der Segmentanzahl entsprechend anpassen.
Asynchrone Verarbeitung kann direkt mit `await` erfolgen.

Die Nutzer-Routen sind Demonstrationen: Sie speichern nichts und prüfen keine
Existenz. POST erzeugt eine feste Demo-ID; PUT/PATCH geben die Nutzlast zurück.
Für produktive Routen Eingaben, Berechtigungen, Speicherung und Fehlerbehandlung
je Ressource ergänzen. Interne Fehler nicht ungefiltert ins Frontend reichen.

## Aufbau

`src/services/electron-api.ts` → `window.electronApi.request` → isoliertes
Preload-Skript → IPC-Kanal `api:request` → Router im Electron-Main-Prozess.
Gemeinsame Typen stehen in `src/shared/electron-api.ts`. Nur die Request-Funktion
wird freigegeben, kein allgemeiner IPC- oder Node-Zugriff. Navigation und neue
Fenster werden blockiert, damit fremde Seiten die Bridge nicht übernehmen.
Es wird kein HTTP-Port geöffnet; externe Programme können diese API nicht
aufrufen. Die API ist ausschließlich innerhalb der Electron-Anwendung verfügbar.
