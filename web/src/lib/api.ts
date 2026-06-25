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
  const { hostname, protocol, port } = window.location;

  // Local development with raw ports (e.g. npm run dev on port 3000)
  if ((hostname === 'localhost' || hostname.startsWith('192.168.')) && port && port !== '80' && port !== '443') {
    return `${protocol}//${hostname}:3001`;
  }

  // Docker Compose setup (via Nginx proxy on port 80/443) or Production VPS
  return `${protocol}//${hostname}/api`;
}
