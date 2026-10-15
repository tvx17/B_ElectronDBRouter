import type {
  ApiRequest,
  ApiResponse,
  JsonValue
} from "../src/shared/electron-api";
import type { DatabaseManager } from "./database/manager";

function isJson(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  return (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value).every(isJson)
  );
}

// Validierung bleibt im Main-Prozess: Renderer-Eingaben sind nicht vertrauenswürdig.
export async function routeRequest(
  input: unknown,
  database?: DatabaseManager
): Promise<ApiResponse> {
  try {
    if (!input || typeof input !== "object") {
      return { status: 400, data: { error: "Ungültige Anfrage." } };
    }
    const { method, url, data } = input as ApiRequest;
    if (
      !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method) ||
      typeof url !== "string" ||
      !url.startsWith("/") ||
      url.startsWith("//") ||
      url.includes("\\") ||
      (data !== undefined && !isJson(data))
    ) {
      return {
        status: 400,
        data: { error: "Methode, URL oder JSON ungültig." }
      };
    }

    const parsed = new URL(url, "https://electron.invalid");
    const segments = parsed.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    const [resource, id] = segments;
    if (segments.length > 2) {
      return { status: 404, data: { error: "Route nicht gefunden." } };
    }

    // Hier eigene Ressourcen und Methoden ergänzen. Kein HTTP-Server notwendig.
    switch (resource) {
      case "database":
        if (method !== "GET" || id)
          return { status: 405, data: { error: "Nur GET /database erlaubt." } };
        return database
          ? { status: 200, data: database.status() }
          : { status: 503, data: { error: "Datenbank nicht verfügbar." } };
      case "notes": {
        if (!database)
          return { status: 503, data: { error: "Datenbank nicht verfügbar." } };
        if (id)
          return { status: 404, data: { error: "Route nicht gefunden." } };
        if (method === "GET")
          return {
            status: 200,
            data: {
              items: (await database.listNotes()).map(note => ({ ...note }))
            }
          };
        if (method !== "POST")
          return { status: 405, data: { error: "Nur GET und POST erlaubt." } };
        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          typeof data.title !== "string" ||
          !data.title.trim() ||
          data.title.length > 1000
        ) {
          return {
            status: 400,
            data: { error: "title muss 1 bis 1000 Zeichen enthalten." }
          };
        }
        return {
          status: 201,
          data: { ...(await database.addNote(data.title.trim())) }
        };
      }
      case "users":
        switch (method) {
          case "GET":
            return {
              status: 200,
              data: id
                ? { id, name: "Beispielnutzer" }
                : {
                    items: [{ id: "42", name: "Beispielnutzer" }],
                    search: parsed.searchParams.get("search")
                  }
            };
          case "POST":
          case "PUT":
          case "PATCH":
            if ((method === "POST" && id) || (method !== "POST" && !id)) {
              return {
                status: 405,
                data: { error: "Methode für diese Route nicht erlaubt." }
              };
            }
            if (
              !data ||
              Array.isArray(data) ||
              typeof data !== "object" ||
              typeof data.name !== "string" ||
              !data.name.trim()
            ) {
              return {
                status: 400,
                data: { error: "Ein JSON-Objekt mit name ist erforderlich." }
              };
            }
            return {
              status: method === "POST" ? 201 : 200,
              data: { id: id ?? "demo-new", ...data }
            };
          case "DELETE":
            return id
              ? { status: 200, data: { deleted: id } }
              : {
                  status: 405,
                  data: { error: "Eine Nutzer-ID ist erforderlich." }
                };
        }
    }
    return { status: 404, data: { error: "Route nicht gefunden." } };
  } catch (error) {
    if (!(error instanceof URIError) && !(error instanceof TypeError)) {
      console.error("API-Verarbeitung fehlgeschlagen:", error);
      return { status: 500, data: { error: "Interner Verarbeitungsfehler." } };
    }
    return {
      status: 400,
      data: { error: "Anfrage konnte nicht verarbeitet werden." }
    };
  }
}
