/**
 * Resolve API base URL dynamically:
 * - HTTPS page → https://[same-host]:3001  (API runs HTTPS on 3001)
 * - HTTP localhost → http://localhost:3001
 * - HTTP LAN IP → http://[same-host]:3001
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001'; // SSR fallback
  }
  const { hostname, protocol } = window.location;

  // Local development (localhost or LAN IP)
  if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
    return `${protocol}//${hostname}:3001`;
  }

  // Production VPS (reverse proxy routes /api to NestJS port 3001)
  return `${protocol}//${hostname}/api`;
}
