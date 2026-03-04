'use server';

/**
 * Server Action to fetch news from GNews API.
 * This bypasses CORS issues encountered when fetching from the client.
 */
export async function fetchGNewsAction(q: string, lang: string, country: string, page: number, apiKey: string) {
  const query = q && q.trim() !== "" ? q : 'general';
  const language = lang || 'en';
  const countryParam = country && country !== 'any' ? `&country=${country}` : '';
  
  // GNews allows category-based search if q is omitted, but we prioritize search with q.
  // We'll use the 'top-headlines' endpoint if topics are just categories.
  const isCategory = ['general', 'world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'].includes(query.toLowerCase());
  
  const endpoint = isCategory ? 'top-headlines' : 'search';
  const qParam = isCategory ? `category=${query}` : `q=${encodeURIComponent(query)}`;
  
  const url = `https://gnews.io/api/v4/${endpoint}?${qParam}&lang=${language}${countryParam}&page=${page}&max=12&apikey=${apiKey}`;
  
  try {
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
