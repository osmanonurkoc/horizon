import { NextResponse } from 'next/server';

/**
 * Server-side proxy for API-Football to bypass client-side CORS restrictions.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team');
  const season = searchParams.get('season');
  const key = request.headers.get('x-apisports-key');

  if (!team || !season || !key) {
    return NextResponse.json({ 
      errors: { msg: "Missing parameters: team, season, or x-apisports-key header required" } 
    }, { status: 400 });
  }

  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?team=${team}&season=${season}`, {
      headers: { 
        'x-apisports-key': key,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Sports Proxy Error:", err);
    return NextResponse.json({ 
      errors: { msg: "Stadium Network link failed at the proxy level." } 
    }, { status: 500 });
  }
}
