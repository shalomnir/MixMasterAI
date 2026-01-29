/**
 * Environment Configuration
 * =========================
 * Switch between local dev and production by changing one line.
 *
 * Local Testing:  window.API_BASE_URL = 'http://127.0.0.1:5000';
 * Production:     window.API_BASE_URL = 'https://api.mixmasterai.app';
 *
 * Auto-detection: If running on localhost, uses local API; otherwise production.
 */

(function () {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Local environments: localhost, 127.0.0.1, file:// protocol, or IP starting with 192.168
    const isLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '' ||  // file:// protocol
        protocol === 'file:' ||
        hostname.startsWith('192.168.');

    window.API_BASE_URL = isLocal
        ? 'http://127.0.0.1:5000'
        : 'https://api.mixmasterai.app';

    console.log(`[Config] API: ${window.API_BASE_URL} (${isLocal ? 'local' : 'production'})`);
})();
