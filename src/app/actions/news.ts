'use server';

/**
 * Server Action to fetch news from GNews API.
 * This bypasses CORS issues encountered when fetching from the client.
 */
export async function fetchGNewsAction(q: string, lang: string, page: number, apiKey: string) {
  const query = q && q.trim() !== "" ? q : 'general';
  const language = lang || 'en';
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${language}&page=${page}&max=12&apikey=${apiKey}`;
  
  try {
    // We remove server-side caching to ensure the client-side refresh logic 
    // and config changes are always respected immediately.
    const res = await fetch(url, { cache: 'no-store' });
    
    const json = await res.json();

    if (!res.ok) {
      const msg = json.errors ? json.errors[0] : `GNews API Error (Status ${res.status})`;
      throw new Error(msg);
    }
    
    return json.articles || [];
  } catch (err: any) {
    console.error("News Server Action Error:", err.message);
    throw new Error(err.message || "Deep Dive interrupted by a connection issue.");
  }
}
