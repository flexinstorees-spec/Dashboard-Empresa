// VITE_API_URL should be the backend ROOT URL without trailing /api
// e.g. "https://my-api.railway.app" (not "https://my-api.railway.app/api")
const externalUrl = (import.meta.env.VITE_API_URL as string | undefined)
  ?.replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

// API_BASE used by pages that call fetch() directly.
// On Replit (same-domain): "/api"
// On Netlify + external backend: "https://my-api.railway.app/api"
export const API_BASE: string = externalUrl
  ? `${externalUrl}/api`
  : (import.meta.env.BASE_URL as string)
      ?.replace(/\/$/, "")
      .replace(/\/painel-financeiro$/, "") + "/api";

// BASE_URL_ROOT is the backend root (no /api suffix).
// Used by setBaseUrl() for the generated API client whose paths already include /api.
// Null when running same-domain (no setBaseUrl needed — relative paths work).
export const API_ROOT_URL: string | null = externalUrl ?? null;
