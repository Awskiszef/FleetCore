"use client";

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    let [resource, config] = args;

    // Only intercept requests to our backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (typeof resource === 'string' && (apiUrl && resource.startsWith(apiUrl))) {
      const token = localStorage.getItem('token');

      if (token) {
        config = config || {};
        const headers = new Headers(config.headers || {});
        headers.set('Authorization', `Bearer ${token}`);

        // Convert headers back to an object or pass the Headers instance
        config.headers = headers;
      }
    }

    return originalFetch(resource, config);
  };
}
