"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowRight, ShieldCheck, Loader2, AlertCircle, History, Timer } from "lucide-react";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { cachedFetch } from "@/lib/api-fetcher";
import { cn } from "@/lib/utils";

interface TeamResult {
  teamName: string;
  lastScore: string;
  opponent: string;
  isLive: boolean;
  status: string;
  date: string;
}

const SPORTS_CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

export function SportsWidget({ config }: { config: DiscoverConfig }) {
  const [results, setResults] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSportsData = useCallback(async () => {
    if (config.sportsTeams.length === 0 || !config.apiKeys.sports) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const teamResults = await Promise.all(
        config.sportsTeams.map(async (teamName) => {
          return cachedFetch(
            `sports_v21_${teamName.replace(/\s+/g, '_')}`,
            async () => {
              try {
                // Sanitize team name for API-Football (alpha-numeric and spaces only)
                const sanitizedTeamName = teamName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
                if (!sanitizedTeamName) return null;

                // 1. Search Team
                const searchRes = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(sanitizedTeamName)}`, {
                  headers: { "x-apisports-key": config.apiKeys.sports }
                });
                if (!searchRes.ok) throw new Error(`HTTP Error ${searchRes.status}`);
                
                const searchJson = await searchRes.json();
                
                // Intercept API-Football Errors
                if (searchJson.errors && Object.keys(searchJson.errors).length > 0) {
                  const apiError = Object.values(searchJson.errors)[0] as string;
                  console.warn("API-Football Widget Error:", apiError);
                  throw new Error(apiError);
                }

                const teamId = searchJson.response?.[0]?.team?.id;
                if (!teamId) return null;

                // 2. Get Last 5 Fixtures
                const fixturesRes = await fetch(`https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5`, {
                  headers: { "x-apisports-key": config.apiKeys.sports }
                });
                if (!fixturesRes.ok) return null;
                const fixturesJson = await fixturesRes.json();
                
                if (fixturesJson.errors && Object.keys(fixturesJson.errors).length > 0) {
                  throw new Error(Object.values(fixturesJson.errors)[0] as string);
                }
                
                if (!fixturesJson?.response || fixturesJson.response.length === 0) return null;
                
                const lastMatch = fixturesJson.response[0];
                const isHome = lastMatch.teams.home.id === teamId;
                const opponent = isHome ? lastMatch.teams.away.name : lastMatch.teams.home.name;
                const score = `${lastMatch.goals.home ?? 0} - ${lastMatch.goals.away ?? 0}`;
                const status = lastMatch.fixture.status.short;

                return {
                  teamName: isHome ? lastMatch.teams.home.name : lastMatch.teams.away.name,
                  lastScore: score,
                  opponent: opponent,
                  isLive: status !== 'FT' && status !== 'NS' && status !== 'CANC',
                  status: status,
                  date: new Date(lastMatch.fixture.date).toLocaleDateString()
                } as TeamResult;
              } catch (e: any) {
                console.warn(`Sports fetch skip for ${teamName}:`, e.message);
                return null;
              }
            },
            SPORTS_CACHE_EXPIRY
          );
        })
      );

      const validResults = teamResults.filter((r): r is TeamResult => r !== null);
      setResults(validResults);
    } catch (err: any) {
      setError(`Sports Link Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [config.sportsTeams, config.apiKeys.sports]);

  useEffect(() => {
    fetchSportsData();
  }, [fetchSportsData]);

  if (config.sportsTeams.length === 0 || !config.apiKeys.sports) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
          <Trophy className="w-12 h-12 mb-2 opacity-30" />
          <p className="font-medium">Sports Setup Required</p>
          <p className="text-xs">Add API key and teams in settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <div className="h-48 rounded-3xl-card animate-skeleton bg-muted/40" />;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="rounded-3xl-card bg-card overflow-hidden cursor-pointer group hover:border-primary/50 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Stadium Central</CardTitle>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {error ? (
              <div className="py-10 text-center space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-destructive/50" />
                <p className="text-sm font-bold text-muted-foreground">{error}</p>
              </div>
            ) : results.length > 0 ? results.map((result, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary font-black text-xl">
                    {result.teamName[0]}
                  </div>
                  <div>
                    <p className="font-black font-headline text-lg group-hover:text-primary transition-colors">{result.teamName}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">vs {result.opponent}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 mb-1">
                    {result.isLive && <div className="pulsating-dot" />}
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                      result.isLive ? "text-red-600 bg-red-100" : "text-muted-foreground bg-muted"
                    )}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-xl font-black tabular-nums">{result.lastScore}</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center space-y-2">
                <Trophy className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-bold text-muted-foreground">No recent match signals for your teams.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold">Stadium Insights</DialogTitle>
          <DialogDescription>
            Live scores and verified historical performance for your followed teams via API-Football.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="p-6 bg-secondary/5 rounded-3xl border border-secondary/10 space-y-4">
            <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-secondary" /> Network Status</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Global stadium data is refreshed every 10 minutes. Live indicators will automatically activate during match time.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Historical Stream</h4>
            {results.map((res, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-muted/20 rounded-2xl hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-black text-primary">{res.teamName}</span>
                  <span className="text-xs font-bold text-muted-foreground">vs {res.opponent}</span>
                </div>
                <div className="text-right">
                  <span className="block font-black text-lg">{res.lastScore}</span>
                  <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">{res.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
