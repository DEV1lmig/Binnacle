import Constants from "expo-constants";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhost(url: string): boolean {
  return /(?:localhost|127\.0\.0\.1)/i.test(url);
}

/**
 * Host (no port) of the Metro / Expo dev server, e.g. "192.168.1.5".
 *
 * In development the share image is rendered by the Next.js web app, which runs
 * on the same machine as Metro. A physical device can't reach that server via
 * "localhost" (that points at the device itself), so we reuse the LAN IP Expo
 * already uses to serve the JS bundle.
 */
function getDevServerHost(): string | null {
  const c = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };

  const candidates = [
    c.expoConfig?.hostUri,
    c.expoGoConfig?.debuggerHost,
    c.manifest2?.extra?.expoGo?.debuggerHost,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  for (const candidate of candidates) {
    const host = candidate.split("://").pop()?.split("/")[0]?.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }
  return null;
}

/**
 * Base URL of the web app that renders share-card images
 * (`/api/og/review/[id]`). Resolution order:
 *
 *   1. A configured non-localhost URL (EXPO_PUBLIC_SHARE_BASE_URL or
 *      app.json `extra.shareBaseUrl`) — used for staging / production deploys.
 *   2. In development, rewrite localhost to the dev machine's LAN IP so a
 *      physical device can reach the local Next.js dev server.
 *   3. Fall back to the configured value (or localhost for the iOS simulator).
 */
export function getShareBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_SHARE_BASE_URL?.trim();
  const extraUrl = (
    Constants.expoConfig?.extra?.shareBaseUrl as string | undefined
  )?.trim();
  const configured = envUrl || extraUrl;

  if (configured && !isLocalhost(configured)) {
    return stripTrailingSlash(configured);
  }

  const devHost = getDevServerHost();
  if (devHost) {
    const port = configured?.match(/:(\d+)/)?.[1] ?? "3000";
    return `http://${devHost}:${port}`;
  }

  return stripTrailingSlash(configured || "http://localhost:3000");
}
