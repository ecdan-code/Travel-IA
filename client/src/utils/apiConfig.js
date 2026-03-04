/**
 * Detects the API base URL based on the current environment.
 * 
 * In PRODUCTION (Render.com): client and server are on the same origin,
 * so we use '' (empty string = relative URLs like /api/suggest).
 * 
 * In DEVELOPMENT: uses localhost:5000 or the network IP for mobile testing.
 */
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;

    // Development: localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }

    // Development: network IP (for testing on phone via WiFi)
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        return `http://${hostname}:5000`;
    }

    // Production: same origin (client served by Express)
    // Returns empty string so fetch('/api/suggest') goes to same domain
    return '';
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
