import { NextResponse } from 'next/server';

/**
 * Server-side proxy for Yahoo Finance to bypass client-side CORS restrictions.
 * Includes edge caching for 5 minutes.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '1d';
  const range = searchParams.get('range') || '1d';

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      },
      next: { revalidate: 300 } // Cache on Vercel for 5 minutes
    });

    if (!res.ok) {
      throw new Error(`Yahoo API returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Yahoo Proxy Error:", error.message);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
