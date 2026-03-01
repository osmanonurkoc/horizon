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
                message: `Optimal conditions for outdoor activities in ${config.location}.`,
                icon: Sun,
                color: 'blue'
              });
            }
          }
        } catch (e) {
          console.warn("Weather Insight Failed:", e);
        }
      }

      // 2. Sports Insight (Aggregated Priority: Next Match > Latest Result)
      if (config.enabledWidgets.sports && config.sportsTeams.length > 0) {
        try {
          let sportInsight: Insight | null = null;

          for (const team of config.sportsTeams) {
            // Check for next match first
            const nextRes = await fetch(`/api/sports?endpoint=next&team=${team.id}`, {
              headers: { "x-sports-key": config.apiKeys.sports || '3' }
            });
            const nextData = await nextRes.json();

            if (nextData.events && nextData.events.length > 0) {
              const next = nextData.events[0];
              const date = new Date(next.dateEvent).toLocaleDateString();
              sportInsight = {
                type: 'sports',
                title: 'NEXT MATCH',
                message: `${next.strHomeTeam} vs ${next.strAwayTeam} on ${date}`,
                icon: Trophy,
                color: 'red'
              };
              break; // Prioritize first found next match
            }
          }

          // If no next match found for any team, look for latest result of first team
          if (!sportInsight && config.sportsTeams.length > 0) {
            const lastRes = await fetch(`/api/sports?endpoint=last&team=${config.sportsTeams[0].id}`, {
              headers: { "x-sports-key": config.apiKeys.sports || '3' }
            });
            const lastData = await lastRes.json();
            if (lastData.results && lastData.results.length > 0) {
              const last = lastData.results[0];
              sportInsight = {
                type: 'sports',
                title: 'LATEST RESULT',
                message: `${last.strHomeTeam} ${last.intHomeScore} - ${last.intAwayScore} ${last.strAwayTeam}`,
                icon: Trophy,
                color: 'red'
              };
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
      <div className="flex gap-4 justify-center items-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synthesizing Horizon...</span>
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
            insight.color === 'blue' ? 'bg-blue-500' :
            insight.color === 'red' ? 'bg-red-500' :
            'bg-emerald-500';

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
