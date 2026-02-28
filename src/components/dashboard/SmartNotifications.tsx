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
}

/**
 * Robust fetcher that tries multiple proxies to avoid CORS and HTML-instead-of-JSON errors.
 */
async function robustProxyFetch(targetUrl: string) {
  const encodedUrl = encodeURIComponent(targetUrl);
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodedUrl}`,
    `https://corsproxy.io/?${encodedUrl}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl);
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

      // 1. Weather Event (Rain or Temperature shifts)
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

      // 2. Sports Insight (STRICTLY for Followed Teams Only)
      if (config.enabledWidgets.sports && config.sportsTeams.length > 0) {
        try {
          for (const teamName of config.sportsTeams) {
            const sportInsight = await cachedFetch(
              `insight_sports_event_next_v2_${teamName.replace(/\s+/g, '_')}`,
              async () => {
                const search = await robustProxyFetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`);
                
                // Strict matching to prevent "Exeter City" random results
                const team = search?.teams?.find((t: any) => 
                  t.strTeam.toLowerCase() === teamName.toLowerCase() || 
                  t.strAlternate?.toLowerCase() === teamName.toLowerCase()
                );

                if (!team) return null;
                
                const teamId = team.idTeam;
                const next = await robustProxyFetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${teamId}`);
                return next?.events?.[0] || null;
              },
              EXPIRY_TIMES.WEATHER
            );

            if (sportInsight) {
              newInsights.push({
                type: 'sports',
                title: 'Next Match',
                message: `${sportInsight.strEvent} on ${sportInsight.dateEvent} at ${sportInsight.strTime || 'TBD'}.`,
                icon: Trophy,
                color: 'red'
              });
              // Show only the first found match for followed teams
              break;
            }
          }
        } catch (e) {}
      }

      // 3. Market Insight (Top Mover)
      if (config.enabledWidgets.market && config.stocks.length > 0) {
        try {
          const symbol = config.stocks[0].split(' ')[0];
          const marketInsight = await cachedFetch(
            `insight_market_pulse_${symbol}`,
            async () => {
              const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
              return await robustProxyFetch(url);
            },
            EXPIRY_TIMES.WEATHER
          );

          const meta = marketInsight?.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice;
            const prev = meta.chartPreviousClose;
            const diff = ((price - prev) / prev) * 100;
            
            newInsights.push({
              type: 'market',
              title: 'Portfolio Trend',
              message: `${symbol} is currently ${diff >= 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(2)}% in this session.`,
              icon: TrendingUp,
              color: 'emerald'
            });
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className={`p-3 rounded-2xl text-white shadow-md ${iconBg}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 opacity-80">{insight.title}</p>
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
