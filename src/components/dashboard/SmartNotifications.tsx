"use client";

import { useEffect, useState } from "react";
import { type DiscoverConfig } from "@/lib/config-store";
import { Card, CardContent } from "@/components/ui/card";
import { CloudRain, Trophy, TrendingUp, Loader2, Sun } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";

interface Insight {
  type: 'weather' | 'sports' | 'market';
  title: string;
  message: string;
  icon: any;
  color: string;
  isLive?: boolean;
}

/**
 * Client-side fetcher for notifications - USES UNIFIED SERVER PROXY
 * Ensures stability and navigates CORS/Season restrictions.
 * Uses unified cache key shared with SportsWidget.
 */
async function fetchSportsInsightsClient(teamId: number, apiKey: string) {
  const cacheKey = `sports_data_v5_${teamId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 5 minutes
      if (Date.now() - timestamp < 300000) return data;
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  try {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const season = month < 7 ? year - 1 : year;

    // Fetch via our local server-side proxy
    const url = `/api/sports?team=${teamId}&season=${season}`;
    const res = await fetch(url, {
      headers: { 
        "x-apisports-key": apiKey, 
        "Accept": "application/json" 
      }
    });
    const data = await res.json();
    
    // Self-healing fallback for free tier season restrictions
    if (data.errors && Object.values(data.errors)[0]?.toString().includes("try from")) {
      const errorStr = Object.values(data.errors)[0] as string;
      const match = errorStr.match(/to (\d{4})/);
      const fallbackSeason = match ? match[1] : '2024';
      
      const fallbackUrl = `/api/sports?team=${teamId}&season=${fallbackSeason}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { "x-apisports-key": apiKey, "Accept": "application/json" }
      });
      const fallbackData = await fallbackRes.json();
      const response = fallbackData.response || [];
      localStorage.setItem(cacheKey, JSON.stringify({ data: response, timestamp: Date.now() }));
      return response;
    }

    const response = data.response || [];
    localStorage.setItem(cacheKey, JSON.stringify({ data: response, timestamp: Date.now() }));
    return response;
  } catch (e) {
    console.warn("Sports Fetch Insight Failed:", e);
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
            `insight_weather_v5_${config.location}`,
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
                message: `Conditions remain favorable for outdoor activities in ${config.location}.`,
                icon: Sun,
                color: 'blue'
              });
            }
          }
        } catch (e) {
          console.warn("Weather Insight Failed:", e);
        }
      }

      // 2. Sports Insight (Aggregated Priority: Live > Next)
      // Removed "Latest Result" to focus on upcoming/live events as requested.
      if (config.enabledWidgets.sports && config.sportsTeams.length > 0 && config.apiKeys.sports) {
        try {
          const now = Math.floor(Date.now() / 1000);
          let allFixtures: any[] = [];

          // Sequential fetch with 1s delay to protect rate limits (10req/min)
          for (const team of config.sportsTeams) {
            const fixtures = await fetchSportsInsightsClient(team.id, config.apiKeys.sports);
            if (fixtures && fixtures.length > 0) {
              allFixtures = [...allFixtures, ...fixtures];
            }
            if (config.sportsTeams.length > 1) {
              await new Promise(res => setTimeout(res, 1000));
            }
          }

          if (allFixtures.length > 0) {
            const liveMatch = allFixtures.find(f => 
              ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(f.fixture.status.short)
            );

            const nextMatch = allFixtures
              .filter(f => f.fixture.timestamp > now && ['NS', 'TBD'].includes(f.fixture.status.short))
              .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)[0];

            let sportInsight: Insight | null = null;

            if (liveMatch) {
              sportInsight = {
                type: 'sports',
                title: 'LIVE SCORE',
                message: `${liveMatch.teams.home.name} ${liveMatch.goals.home} - ${liveMatch.goals.away} ${liveMatch.teams.away.name} (${liveMatch.fixture.status.elapsed}')`,
                icon: Trophy,
                color: 'red',
                isLive: true
              };
            } else if (nextMatch) {
              const date = new Date(nextMatch.fixture.date).toLocaleDateString();
              sportInsight = {
                type: 'sports',
                title: 'Next Match',
                message: `${nextMatch.teams.home.name} vs ${nextMatch.teams.away.name} on ${date}`,
                icon: Trophy,
                color: 'red'
              };
            }

            if (sportInsight) newInsights.push(sportInsight);
          }
        } catch (e) {
          console.warn("Sports Insight Failed:", e);
        }
      }

      // 3. Market Insight - USES NATIVE SERVER PROXY
      if (config.enabledWidgets.market && config.stocks.length > 0) {
        try {
          const symbol = config.stocks[0].split(' ')[0];
          const marketInsight = await cachedFetch(
            `insight_market_v7_${symbol}`,
            async () => {
              const res = await fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}`);
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
                message: `${symbol} is ${diff >= 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(2)}% in this session.`,
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
      <div className="flex gap-4 justify-center items-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synthesizing Briefing...</span>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          const colorClass = 
            insight.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' :
            insight.color === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300' :
            'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300';
          
          const iconBg = 
            insight.color === 'blue' ? 'bg-blue-500 shadow-blue-500/30' :
            insight.color === 'red' ? 'bg-red-500 shadow-red-500/30' :
            'bg-emerald-500 shadow-emerald-500/30';

          return (
            <Card key={idx} className={`rounded-[2rem] border shadow-sm group transition-all hover:scale-[1.02] hover:shadow-lg ${colorClass}`}>
              <CardContent className="p-6 flex items-center gap-6">
                <div className={`p-4 rounded-2xl text-white shadow-lg ${iconBg} relative shrink-0`}>
                  <Icon className="w-7 h-7" />
                  {insight.isLive && (
                    <div className="absolute -top-1 -right-1">
                      <div className="pulsating-dot" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{insight.title}</p>
                    {insight.isLive && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-sm animate-pulse">LIVE</span>
                    )}
                  </div>
                  <p className="text-base font-bold text-foreground/90 leading-tight line-clamp-2">{insight.message}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
