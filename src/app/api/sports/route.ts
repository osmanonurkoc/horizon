import { NextResponse } from 'next/server';

/**
 * Server-side proxy for TheSportsDB to bypass client-side CORS restrictions.
 * Supports team search, fixture lookup (last/next), and league standings.
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
  
  try {
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

    const res = await fetch(targetUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`External API returned ${res.status}`);
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("TheSportsDB Proxy Error:", error.message);
    return NextResponse.json({ error: "Stadium connection failed." }, { status: 500 });
  }
}
