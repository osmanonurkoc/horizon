"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowRight, ShieldCheck, Loader2, AlertCircle, History } from "lucide-react";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { cn } from "@/lib/utils";

interface TeamResult {
  teamName: string;
  lastScore: string;
  opponent: string;
  isLive: boolean;
  status: string;
  date: string;
}

export function SportsWidget({ config }: { config: DiscoverConfig }) {
  const [results, setResults] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config.sportsTeams.length === 0) {
      setLoading(false);
      return;
    }

    const fetchSportsData = async () => {
      setLoading(true);
      setError(null);
      try {
        const teamData = await Promise.all(
          config.sportsTeams.map(async (teamName) => {
            return cachedFetch(
              `sports_v10_${teamName.replace(/\s+/g, '_')}`,
              async () => {
                const searchRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`);
                const searchJson = await searchRes.json();
                
                if (!searchJson.teams || searchJson.teams.length === 0) return null;
                
                const team = searchJson.teams[0];
                const teamId = team.idTeam;

                const eventsRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${teamId}`);
                const eventsJson = await eventsRes.json();
                
                if (!eventsJson.results || eventsJson.results.length === 0) return null;
                
                const lastMatch = eventsJson.results[0];
                const isHome = lastMatch.idHomeTeam === teamId;
                const opponent = isHome ? lastMatch.strAwayTeam : lastMatch.strHomeTeam;
                const score = `${lastMatch.intHomeScore} - ${lastMatch.intAwayScore}`;

                return {
                  teamName: team.strTeam,
                  lastScore: score,
                  opponent: opponent,
                  isLive: false,
                  status: lastMatch.strStatus || 'FT',
                  date: lastMatch.dateEvent
                } as TeamResult;
              },
              EXPIRY_TIMES.WEATHER
            );
          })
        );

        setResults(teamData.filter((r): r is TeamResult => r !== null));
      } catch (err: any) {
        setError("Stadium link offline.");
      } finally {
        setLoading(false);
      }
    };

    fetchSportsData();
  }, [config.sportsTeams]);

  if (config.sportsTeams.length === 0) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
          <Trophy className="w-12 h-12 mb-2 opacity-30" />
          <p className="font-medium">Sports Setup Required</p>
          <p className="text-xs">Add your teams in settings.</p>
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
            {results.length > 0 ? results.slice(0, 3).map((result, i) => (
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
                <AlertCircle className="w-8 h-8 mx-auto text-destructive/50" />
                <p className="text-sm font-bold text-muted-foreground">{error || "No recent results found."}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold">Stadium Insights</DialogTitle>
          <DialogDescription>
            Live scores, upcoming fixtures, and verified performance history for your teams.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="p-6 bg-secondary/5 rounded-3xl border border-secondary/10 space-y-4">
            <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-secondary" /> Recent Performance Data</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Global stadium results are updated within 60 minutes of match completion. Live tracking indicators appear during scheduled game times.
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
