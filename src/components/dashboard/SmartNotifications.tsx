"use client";

import { useEffect, useState } from "react";
import { type DiscoverConfig } from "@/lib/config-store";
import { Card, CardContent } from "@/components/ui/card";
import { CloudRain, Trophy, TrendingUp, Calendar, Loader2, AlertCircle } from "lucide-react";
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

      // 1. Weather Insight (Forecast Shifts)
      if (config.enabledWidgets.weather && config.location && config.apiKeys.weather) {
        try {
          const forecast = await cachedFetch(
            `insight_weather_${config.location}`,
            async () => {
              const url = `https://api.openweathermap.org/data/2.5/forecast?q=${config.location}&appid=${config.apiKeys.weather}&units=metric&cnt=8`;
              const res = await fetch(url);
              return res.ok ? await res.json() : null;
            },
            EXPIRY_TIMES.WEATHER
          );

          if (forecast?.list) {
            const willRain = forecast.list.some((item: any) => item.weather[0].main.toLowerCase().includes('rain'));
            if (willRain) {
              newInsights.push({
                type: 'weather',
                title: 'Rain Alert',
                message: `Precipitation detected in the 24-hour forecast for ${config.location}.`,
                icon: CloudRain,
                color: 'blue'
              });
            } else {
              newInsights.push({
                type: 'weather',
                title: 'Sky Watch',
                message: `Skies over ${config.location} expected to remain clear.`,
                icon: Calendar,
                color: 'blue'
              });
            }
          }
        } catch (e) {}
      }

      // 2. Sports Insight (Next Match)
      if (config.enabledWidgets.sports && config.sportsTeams.length > 0) {
        try {
          const teamName = config.sportsTeams[0];
          const sportInsight = await cachedFetch(
            `insight_sports_${teamName.replace(/\s+/g, '_')}`,
            async () => {
              const search = await robustProxyFetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`);
              if (!search?.teams?.[0]) return null;
              
              const teamId = search.teams[0].idTeam;
              const next = await robustProxyFetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${teamId}`);
              return next?.events?.[0] || null;
            },
            EXPIRY_TIMES.WEATHER
          );

          if (sportInsight) {
            newInsights.push({
              type: 'sports',
              title: 'Upcoming Match',
              message: `${sportInsight.strEvent} scheduled for ${sportInsight.dateEvent} at ${sportInsight.strTime || 'TBD'}.`,
              icon: Trophy,
              color: 'red'
            });
          }
        } catch (e) {}
      }

      // 3. Market Insight (Top Mover)
      if (config.enabledWidgets.market && config.stocks.length > 0) {
        try {
          const symbol = config.stocks[0].split(' ')[0];
          const marketInsight = await cachedFetch(
            `insight_market_${symbol}`,
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
              title: 'Portfolio Pulse',
              message: `${symbol} is trending ${diff >= 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(2)}% in the current session.`,
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
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Insights...</span>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="flex gap-6 justify-center overflow-x-auto pb-6 scrollbar-hide no-scrollbar w-full">
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
          <Card key={idx} className={`flex-none w-[380px] rounded-3xl border-none border-l-4 shadow-sm group transition-all hover:scale-[1.02] ${colorClass}`}>
            <CardContent className="p-5 flex items-center gap-5">
              <div className={`p-3 rounded-2xl text-white shadow-md ${iconBg}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 opacity-80">{insight.title}</p>
                <p className="text-sm font-bold text-foreground/80 leading-snug truncate-2-lines">{insight.message}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
