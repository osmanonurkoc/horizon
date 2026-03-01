'use server';

/**
 * Server Action to fetch sports data from API-Football.
 * Bypasses CORS and preflight issues by executing on the server.
 */
export async function fetchSportsAction(endpoint: string, apiKey: string) {
  if (!apiKey) throw new Error("API Key is required");

  // Sanitize the endpoint (ensure it doesn't have double slashes if prepended)
  const baseUrl = "https://v3.football.api-sports.io";
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}/${endpoint.replace(/^\//, '')}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      },
      cache: 'no-store' // Ensure fresh data for live/next matches
    });

    const data = await res.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      const msg = Object.values(data.errors)[0] as string;
      throw new Error(msg);
    }

    return data.response || [];
  } catch (err: any) {
    console.error("Sports Action Error:", err.message);
    throw new Error(err.message || "Failed to connect to the Stadium Network.");
  }
}
