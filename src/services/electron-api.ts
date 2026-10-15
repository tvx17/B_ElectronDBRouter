import type { ApiRequest, ApiResponse } from "../shared/electron-api";

export function request(request: ApiRequest): Promise<ApiResponse> {
  if (!window.electronApi) {
    return Promise.reject(
      new Error("Diese API ist nur in der Electron-Anwendung verfügbar.")
    );
  }
  return window.electronApi.request(request);
}
