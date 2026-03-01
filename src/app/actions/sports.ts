
'use server';

/**
 * Server Action to fetch sports data from API-Football.
 * Bypasses CORS and preflight issues by executing on the server.
 * Includes self-healing logic for season restrictions.
 */
export async function fetchSportsAction(endpoint: string, apiKey: string) {
  if (!apiKey) throw new Error("API Key is required");

  const baseUrl = "https://v3.football.api-sports.io";
  let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}/${endpoint.replace(/^\//, '')}`;

  try {
    let res = await fetch(url, {
      method: 'GET',
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      },
      cache: 'no-store'
    });

    let data = await res.json();

    // Self-healing fallback for free tier season restrictions
    // Error looks like: "Free plans do not have access to this season, try from 2022 to 2024."
    if (data.errors && Object.values(data.errors)[0]?.toString().includes("try from")) {
      const errorStr = Object.values(data.errors)[0] as string;
      const match = errorStr.match(/to (\d{4})/);
      const fallbackSeason = match ? match[1] : '2024';
      
      console.warn(`API restricted season. Falling back to season ${fallbackSeason}`);
      
      // Replace the restricted season in the URL with the fallback season
      const newUrl = url.replace(/season=\d{4}/, `season=${fallbackSeason}`);
      
      res = await fetch(newUrl, {
        method: 'GET',
        headers: {
          "x-apisports-key": apiKey,
          "Accept": "application/json"
        },
        cache: 'no-store'
      });
      data = await res.json();
    }

    if (data.errors && Object.keys(data.errors).length > 0) {
      const msg = Object.values(data.errors)[0] as string;
      throw new Error(msg);
    }

    return data.response || [];
  } catch (err: any) {
    console.warn("Sports Action Error:", err.message);
    throw new Error(err.message || "Failed to connect to the Stadium Network.");
  }
}
