
'use server';

/**
 * Server Action to fetch news from GNews API.
 * This bypasses CORS issues encountered when fetching from the client.
 */
export async function fetchGNewsAction(q: string, lang: string, apiKey: string) {
  const query = q || 'general';
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&max=12&apikey=${apiKey}`;
  
  try {
    const res = await fetch(url, { 
      next: { revalidate: 3600 }, // Cache on server for 1 hour
      mode: 'cors' 
    });
    const json = await res.json();

    if (!res.ok) {
      const msg = json.errors ? json.errors[0] : `GNews API Error (Status ${res.status})`;
      throw new Error(msg);
    }
    
    return json.articles || [];
  } catch (err: any) {
    throw new Error(err.message || "Deep Dive interrupted by a connection issue.");
  }
}
