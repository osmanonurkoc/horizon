"use client";

import { useEffect, useState } from "react";
import { type DiscoverConfig } from "@/lib/config-store";
import { Card, CardContent } from "@/components/ui/card";
import { CloudRain, Trophy, TrendingUp, Loader2, Sun } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { fetchSportsAction } from "@/app/actions/sports";

interface Insight {
  type: 'weather' | 'sports' | 'market';
  title: string;
  message: string;
  icon: any;
  color: string;
  isLive?: boolean;
}

// Single Fetch Strategy with Caching and Server Action
async function getFixturesCached(teamId: number, apiKey: string) {
  const cacheKey = `sports_fixtures_v2_${teamId}`;
  const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 300000) return data; 
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const season = month < 7 ? year - 1 : year;

  try {
    const response = await fetchSportsAction(`fixtures?team=${teamId}&season=${season}`, apiKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify({ data: response, timestamp: Date.now() }));
    }
    return response;
  } catch (e) {
    console.warn(`Sports Insight Fetch Error for team ${teamId}:`, e);
    return [];
  }
}

export function SmartNotifications({ config }: { config: DiscoverConfig }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      const newInsights: Insight[] = [];

      // 1. Weather Insight
      if (config.enabledWidgets.weather && config.location && config.apiKeys.weather) {
        try {
          const forecast = await cachedFetch(
            `insight_weather_v2_${config.location}`,
            async () => {
              const url = `https://api.openweathermap.org/data/2.5/forecast?q=${config.location}&appid=${config.apiKeys.weather}&units=metric&cnt=8`;
              const res = await fetch(url);
              return res.ok ? await res.json() : null;
            },
            EXPIRY_TIMES.WEATHER
          );

          if (forecast?.list) {
            const rainItem = forecast.list.find((item: any) => 
              item.weather[0].main.toLowerCase().includes('rain')
            );
            
            if (rainItem) {
              const rainTime = new Date(rainItem.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              newInsights.push({
                type: 'weather',
                title: 'Weather Shift',
                message: `Rain expected around ${rainTime} in ${config.location}.`,
                icon: CloudRain,
                color: 'blue'
              });
            } else {
              newInsights.push({
                type: 'weather',
                title: 'Clear Skies',
                message: `Skies remain clear in ${config.location}. Perfect for the day ahead.`,
                icon: Sun,
                color: 'blue'
              });
            }
          }
        } catch (e) {
          console.warn("Weather Insight Failed:", e);
        }
      }

      // 2. Sports Insight (Strict API-Football)
      if (config.enabledWidgets.sports && config.sportsTeams.length > 0 && config.apiKeys.sports) {
        try {
          let sportInsight: Insight | null = null;
          const now = Math.floor(Date.now() / 1000);
          
          for (const team of config.sportsTeams) {
            const fixtures = await getFixturesCached(team.id, config.apiKeys.sports);
            if (!fixtures || fixtures.length === 0) continue;

            const liveMatch = fixtures.find((f: any) => 
              ['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(f.fixture.status.short)
            );

            if (liveMatch) {
              sportInsight = {
                type: 'sports',
                title: 'LIVE SCORE',
                message: `${liveMatch.teams.home.name} ${liveMatch.goals.home} - ${liveMatch.goals.away} ${liveMatch.teams.away.name} (${liveMatch.fixture.status.elapsed}')`,
                icon: Trophy,
                color: 'red',
                isLive: true
              };
              break;
            }

            const nextMatch = fixtures
              .filter((f: any) => f.fixture.timestamp > now && f.fixture.status.short === 'NS')
              .sort((a: any, b: any) => a.fixture.timestamp - b.fixture.timestamp)[0];

            if (nextMatch) {
              const date = new Date(nextMatch.fixture.date).toLocaleDateString();
              sportInsight = {
                type: 'sports',
                title: 'Next Match',
                message: `${nextMatch.teams.home.name} vs ${nextMatch.teams.away.name} on ${date}`,
                icon: Trophy,
                color: 'red'
              };
              break; 
            }
          }
          if (sportInsight) newInsights.push(sportInsight);
        } catch (e) {
          console.warn("Sports Insight Failed:", e);
        }
      }

      // 3. Market Insight
      if (config.enabledWidgets.market && config.stocks.length > 0) {
        try {
          const symbol = config.stocks[0].split(' ')[0];
          const marketInsight = await cachedFetch(
            `insight_market_v2_${symbol}`,
            async () => {
              const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`;
              const res = await fetch(url);
              return res.ok ? await res.json() : null;
            },
            EXPIRY_TIMES.MARKET
          );

          const meta = marketInsight?.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice;
            const prev = meta.chartPreviousClose;
            if (price !== undefined && prev !== undefined) {
              const diff = ((price - prev) / prev) * 100;
              newInsights.push({
                type: 'market',
                title: 'Portfolio Trend',
                message: `${symbol} is ${diff >= 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(2)}% today.`,
                icon: TrendingUp,
                color: 'emerald'
              });
            }
          }
        } catch (e) {
          console.warn("Market Insight Failed:", e);
        }
      }

      setInsights(newInsights);
      setLoading(false);
    };

    fetchInsights();
  }, [config]);

  if (loading) {
    return (
      <div className="flex gap-4 justify-center items-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synthesizing Briefing...</span>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          const colorClass = 
            insight.color === 'blue' ? 'bg-blue-500/10 border-l-blue-500 text-blue-700' :
            insight.color === 'red' ? 'bg-red-500/10 border-l-red-500 text-red-700' :
            'bg-emerald-500/10 border-l-emerald-500 text-emerald-700';
          
          const iconBg = 
            insight.color === 'blue' ? 'bg-blue-500' :
            insight.color === 'red' ? 'bg-red-500' :
            'bg-emerald-500';

          return (
            <Card key={idx} className={`rounded-3xl border-none border-l-4 shadow-sm group transition-all hover:scale-[1.02] ${colorClass}`}>
              <CardContent className="p-5 flex items-center gap-5">
                <div className={`p-3 rounded-2xl text-white shadow-md ${iconBg} relative`}>
                  <Icon className="w-6 h-6" />
                  {insight.isLive && (
                    <div className="absolute -top-1 -right-1">
                      <div className="pulsating-dot" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{insight.title}</p>
                    {insight.isLive && (
                      <span className="bg-red-500 text-white text-[8px] font-black px-1.5 rounded-sm animate-pulse">LIVE</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground/80 leading-snug line-clamp-2">{insight.message}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
