export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequest {
  method: ApiMethod;
  url: string;
  data?: JsonValue;
}

export interface ApiResponse {
  status: number;
  data: JsonValue;
}

export interface ElectronApi {
  request: (request: ApiRequest) => Promise<ApiResponse>;
}
