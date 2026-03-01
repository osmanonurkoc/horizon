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

async function robustProxyFetch(targetUrl: string, options: RequestInit = {}) {
  const encodedUrl = encodeURIComponent(targetUrl);
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodedUrl}`,
    `https://corsproxy.io/?${encodedUrl}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, options);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) continue;
      return await res.json();
    } catch (e) {}
  }
  return null;
}

export function SmartNotifications({ config }: { config: DiscoverConfig }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      const newInsights: Insight[] = [];

      // 1. Weather Event
      if (config.enabledWidgets.weather && config.location && config.apiKeys.weather) {
        try {
          const forecast = await cachedFetch(
            `insight_weather_event_${config.location}`,
            async () => {
              const url = `https://api.openweathermap.org/data/2.5/forecast?q=${config.location}&appid=${config.apiKeys.weather}&units=metric&cnt=8`;
              const res = await fetch(url);
              return res.ok ? await res.json() : null;
            },
            EXPIRY_TIMES.WEATHER
          );

          if (forecast?.list) {
            const rainItem = forecast.list.find((item: any) => item.weather[0].main.toLowerCase().includes('rain'));
            if (rainItem) {
              const rainTime = new Date(rainItem.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              newInsights.push({
                type: 'weather',
                title: 'Weather Shift',
                message: `Rain expected to begin around ${rainTime} in ${config.location}.`,
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
        } catch (e) {}
      }

      // 2. Sports Insight (API-Football)
      if (config.enabledWidgets.sports && config.sportsTeams.length > 0 && config.apiKeys.sports) {
        try {
          let sportInsight: Insight | null = null;
          
          for (const teamName of config.sportsTeams) {
            const searchData = await robustProxyFetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(teamName)}`, {
              headers: { "x-apisports-key": config.apiKeys.sports }
            });
            const teamId = searchData?.response?.[0]?.team?.id;

            if (teamId) {
              const liveData = await robustProxyFetch(`https://v3.football.api-sports.io/fixtures?team=${teamId}&live=all`, {
                headers: { "x-apisports-key": config.apiKeys.sports }
              });
              
              if (liveData?.response?.length > 0) {
                const match = liveData.response[0];
                sportInsight = {
                  type: 'sports',
                  title: 'LIVE SCORE',
                  message: `${match.teams.home.name} ${match.goals.home} - ${match.goals.away} ${match.teams.away.name} (${match.fixture.status.elapsed}')`,
                  icon: Trophy,
                  color: 'red',
                  isLive: true
                };
                break;
              }

              if (!sportInsight) {
                const nextData = await robustProxyFetch(`https://v3.football.api-sports.io/fixtures?team=${teamId}&next=1`, {
                  headers: { "x-apisports-key": config.apiKeys.sports }
                });
                if (nextData?.response?.length > 0) {
                  const match = nextData.response[0];
                  sportInsight = {
                    type: 'sports',
                    title: 'Next Match',
                    message: `${match.teams.home.name} vs ${match.teams.away.name} on ${new Date(match.fixture.date).toLocaleDateString()}`,
                    icon: Trophy,
                    color: 'red'
                  };
                }
              }
            }
          }
          if (sportInsight) newInsights.push(sportInsight);
        } catch (e) {}
      }

      // 3. Market Insight
      if (config.enabledWidgets.market && config.stocks.length > 0) {
        try {
          const symbol = config.stocks[0].split(' ')[0];
          const marketInsight = await cachedFetch(
            `insight_market_pulse_${symbol}`,
            async () => {
              const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
              const encodedUrl = encodeURIComponent(url);
              const res = await fetch(`https://api.allorigins.win/raw?url=${encodedUrl}`);
              return res.ok ? await res.json() : null;
            },
            EXPIRY_TIMES.WEATHER
          );

          const meta = marketInsight?.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice;
            const prev = meta.chartPreviousClose;
            if (price && prev) {
              const diff = ((price - prev) / prev) * 100;
              newInsights.push({
                type: 'market',
                title: 'Portfolio Trend',
                message: `${symbol} is currently ${diff >= 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(2)}% in this session.`,
                icon: TrendingUp,
                color: 'emerald'
              });
            }
          }
        } catch (e) {}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          const colorClass = 
            insight.color === 'blue' ? 'bg-blue-500/10 border-l-blue-500 text-blue-700 dark:text-blue-400' :
            insight.color === 'red' ? 'bg-red-500/10 border-l-red-500 text-red-700 dark:text-red-400' :
            'bg-emerald-500/10 border-l-emerald-500 text-emerald-700 dark:text-emerald-400';
          
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
