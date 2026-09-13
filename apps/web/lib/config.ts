const API_URL_KEY = "fa_apparels_api_url";

/** Default LAN API for the Android APK (change in Settings if your PC IP differs). */
export const DEFAULT_MOBILE_API_URL = "http://10.20.145.228:4000/api/v1";

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function getStoredApiUrl(): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(API_URL_KEY)?.trim();
  return value || null;
}

export function setStoredApiUrl(url: string): void {
  const cleaned = url.trim().replace(/\/$/, "");
  localStorage.setItem(API_URL_KEY, cleaned);
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  const stored = getStoredApiUrl();
  if (stored) return stored;

  if (typeof window !== "undefined") {
    if (isNativeApp()) return DEFAULT_MOBILE_API_URL;

    const { protocol, hostname } = window.location;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:4000/api/v1`;
    }
  }

  return "http://localhost:4000/api/v1";
}
