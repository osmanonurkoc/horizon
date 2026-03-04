'use server';

/**
 * @fileOverview A deterministic server-side briefing generator.
 * This file replaces the previous Genkit/AI implementation to provide
 * lightning-fast, zero-cost summaries based on real-time data.
 */

export interface PersonalizedBriefingInput {
  enabledWidgets: {
    weather?: boolean;
    market?: boolean;
    newsFeed?: boolean;
    sports?: boolean;
  };
  apiKeys?: any;
  location?: string;
  newsTopics?: any[];
  stocks?: any[];
  sportsTeams?: any[];
}

export type PersonalizedBriefingOutput = string;

/**
 * Generates a personalized briefing by concurrently fetching data from 
 * all enabled widget sources and concatenating them into a summary.
 */
export async function generatePersonalizedBriefing(input: PersonalizedBriefingInput): Promise<PersonalizedBriefingOutput> {
  try {
    const parts: string[] = [];

    // Fetch all data concurrently for maximum speed
    const [weatherData, marketSummary, sportsSummary, newsHeadlines] = await Promise.all([
      (input.enabledWidgets.weather && input.location && input.apiKeys?.weather)
        ? getWeatherData(input.location, input.apiKeys.weather) : Promise.resolve(undefined),
      (input.enabledWidgets.market && input.stocks && input.stocks.length > 0)
        ? getMarketSummary(input.stocks) : Promise.resolve(undefined),
      (input.enabledWidgets.sports && input.sportsTeams && input.sportsTeams.length > 0)
        ? getSportsSummary(input.sportsTeams, input.apiKeys?.sports || '3') : Promise.resolve(undefined),
      (input.enabledWidgets.newsFeed && input.newsTopics && input.newsTopics.length > 0 && input.apiKeys?.news)
        ? getNewsHeadlines(input.newsTopics, input.apiKeys.news) : Promise.resolve(undefined)
    ]);

    if (weatherData) parts.push(weatherData);
    if (marketSummary) parts.push(marketSummary);
    if (sportsSummary) parts.push(sportsSummary);
    if (newsHeadlines && newsHeadlines.length > 0) {
      parts.push(`Top headline: ${newsHeadlines[0]}`); 
    }

    if (parts.length === 0) {
      return "Dashboard synchronized. Modules are up to date and ready.";
    }

    // Naturally concatenate the deterministic strings
    return parts.join(" ");
  } catch (err) {
    console.error("Briefing Generation Error:", err);
    return "Dashboard synchronized. Modules are up to date and ready.";
  }
}

async function getWeatherData(location: string, apiKey: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`);
    const data = await res.json();
    if (data.weather && data.main) {
      return `Current weather in ${location}: ${data.weather[0].description}, Temp: ${Math.round(data.main.temp)}°C.`;
    }
  } catch (e) { return undefined; }
  return undefined;
}

async function getNewsHeadlines(topics: any[], apiKey: string): Promise<string[] | undefined> {
  if (!topics.length) return undefined;
  try {
    const topicVal = typeof topics[0] === 'object' ? (topics[0].value || 'general') : topics[0];
    const res = await fetch(`https://gnews.io/api/v4/top-headlines?category=${topicVal}&lang=en&max=1&apikey=${apiKey}`);
    const data = await res.json();
    if (data.articles && data.articles.length > 0) {
      return data.articles.map((a: any) => a.title);
    }
  } catch(e) { return undefined; }
  return undefined;
}

async function getMarketSummary(stocks: any[]): Promise<string | undefined> {
  if (!stocks.length) return undefined;
  try {
    const symbol = typeof stocks[0] === 'object' ? stocks[0].value : stocks[0];
    const parsedSymbol = symbol.split(' ')[0];
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${parsedSymbol}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice && meta.chartPreviousClose) {
      const price = meta.regularMarketPrice;
      const diff = ((price - meta.chartPreviousClose) / meta.chartPreviousClose) * 100;
      return `${parsedSymbol} is trading at ${price.toFixed(2)} (${diff >= 0 ? '+' : ''}${diff.toFixed(2)}% today).`;
    }
  } catch(e) { return undefined; }
  return undefined;
}

async function getSportsSummary(teams: any[], apiKey: string): Promise<string | undefined> {
  if (!teams.length) return undefined;
  try {
    const team = teams[0];
    const teamId = typeof team === 'object' ? team.id : team;
    const teamName = typeof team === 'object' ? team.name : team;
    
    let res = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnext.php?id=${teamId}`);
    let data = await res.json();
    if (data.events && data.events.length > 0) {
       const next = data.events[0];
       return `${teamName} plays ${next.strAwayTeam === teamName ? next.strHomeTeam : next.strAwayTeam} on ${next.dateEvent}.`;
    }
    res = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventslast.php?id=${teamId}`);
    data = await res.json();
    if (data.results && data.results.length > 0) {
       const last = data.results[0];
       return `${teamName} latest result: ${last.strHomeTeam} ${last.intHomeScore} - ${last.intAwayScore} ${last.strAwayTeam}.`;
    }
  } catch(e) { return undefined; }
  return undefined;
}