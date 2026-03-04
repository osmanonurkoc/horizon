import { NextResponse } from 'next/server';

/**
 * Server-side proxy for TheSportsDB to bypass client-side CORS restrictions.
 * Supports team search, fixture lookup (last/next), and league standings.
 * Includes a dummy data interceptor to filter out inaccurate results from free tier.
 * 
 * ARMOR UPDATE: Gracefully handles rate limits (429) and invalid JSON responses.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const teamId = searchParams.get('team');
  const query = searchParams.get('query');
  const leagueId = searchParams.get('league');
  const season = searchParams.get('season') || '2024-2025';
  
  // Use user key from header or fallback to free test key '3'
  const apiKey = request.headers.get('x-sports-key') || '3';
  const baseUrl = `https://www.thesportsdb.com/api/v1/json/${apiKey}`;

  let targetUrl = '';
  
  if (endpoint === 'search') {
    targetUrl = `${baseUrl}/searchteams.php?t=${encodeURIComponent(query || '')}`;
  } else if (endpoint === 'next') {
    targetUrl = `${baseUrl}/eventsnext.php?id=${teamId}`;
  } else if (endpoint === 'last') {
    targetUrl = `${baseUrl}/eventslast.php?id=${teamId}`;
  } else if (endpoint === 'standings') {
    targetUrl = `${baseUrl}/lookuptable.php?l=${leagueId}&s=${season}`;
  } else {
    return NextResponse.json({ error: "Invalid endpoint requested" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, { cache: 'no-store' });
    
    // ANTI-CRASH 1: Catch rate limits (429) or other non-200 responses gracefully
    if (!res.ok) {
        console.warn(`TheSportsDB API error: ${res.status}`);
        return NextResponse.json({ teams: [], events: [], results: [] });
    }

    // ANTI-CRASH 2: Safely parse text first to prevent JSON.parse crashes on HTML
    const text = await res.text();
    if (!text) return NextResponse.json({ teams: [], events: [], results: [] });
    
    let data;
    try {
        data = JSON.parse(text);
    } catch (parseError) {
        console.error("Failed to parse TheSportsDB response as JSON");
        return NextResponse.json({ teams: [], events: [], results: [] });
    }

    // ANTI-CRASH 3: Safe navigation for the blacklist logic
    if ((endpoint === 'next' || endpoint === 'last') && teamId && data) {
        const eventsArray = data.events || data.results;
        
        if (eventsArray && Array.isArray(eventsArray) && eventsArray.length > 0) {
            // Check if the returned event actually contains the requested teamId
            // Using correct property names idHomeTeam and idAwayTeam
            const isValid = eventsArray.some((e: any) => 
                String(e.idHomeTeam) === String(teamId) || String(e.idAwayTeam) === String(teamId)
            );
            
            if (!isValid) {
                // If it's dummy data (Wycombe etc.), nullify it so the frontend ignores it
                if (endpoint === 'next') data.events = [];
                if (endpoint === 'last') data.results = [];
            }
        }
    }

    return NextResponse.json(data || { teams: [], events: [], results: [] });
  } catch (error) {
    console.error("Sports API Route Error:", error);
    return NextResponse.json({ teams: [], events: [], results: [] });
  }
}
