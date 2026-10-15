import type {
  ApiRequest,
  ApiResponse,
  JsonValue
} from "../src/shared/electron-api";

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
export async function routeRequest(input: unknown): Promise<ApiResponse> {
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
  } catch {
    return {
      status: 400,
      data: { error: "Anfrage konnte nicht verarbeitet werden." }
    };
  }
}
