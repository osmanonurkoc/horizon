'use server';

/**
 * Server Action to fetch news from GNews API.
 * This bypasses CORS issues encountered when fetching from the client.
 * Updated to handle quota limits (429/403) gracefully.
 */
export async function fetchGNewsAction(q: string, lang: string, country: string, page: number, apiKey: string) {
  const query = q && q.trim() !== "" ? q : 'general';
  const language = lang || 'en';
  const countryParam = country && country !== 'any' ? `&country=${country}` : '';
  
  // GNews allows category-based search if q is omitted, but we prioritize search with q.
  const isCategory = ['general', 'world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'].includes(query.toLowerCase());
  
  const endpoint = isCategory ? 'top-headlines' : 'search';
  const qParam = isCategory ? `category=${query}` : `q=${encodeURIComponent(query)}`;
  
  const url = `https://gnews.io/api/v4/${endpoint}?${qParam}&lang=${language}${countryParam}&page=${page}&max=12&apikey=${apiKey}`;
  
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();

    // CRITICAL: Catch quota limits or API errors explicitly to prevent masked 500 crashes
    if (!res.ok || json.errors) {
      const errorMessage = json.errors ? json.errors[0] : `GNews API Error: ${res.statusText || 'Quota exceeded'}`;
      
      // Return the error safely to the frontend instead of throwing a masked server error
      return { 
        articles: [], 
        error: `News Feed Interrupted: ${errorMessage}. Please check your GNews API key quota.` 
      };
    }
    
    return { articles: json.articles || [], error: null };
  } catch (err: any) {
    console.error("News Server Action Error:", err.message);
    return { 
      articles: [], 
      error: "Deep Dive interrupted by a connection issue. Please check your network or API key." 
    };
  }
}
