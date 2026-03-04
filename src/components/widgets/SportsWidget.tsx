"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowRight, AlertCircle, History, Table as TableIcon, Loader2 } from "lucide-react";
import { type DiscoverConfig, type SportsTeam } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamResult {
  teamId: string;
  teamName: string;
  lastScore: string;
  opponent: string;
  isLive: boolean;
  status: string;
  date: string;
  leagueId?: string;
}

interface StandingEntry {
  intRank: string;
  strTeam: string;
  intPlayed: string;
  intWin: string;
  intDraw: string;
  intLoss: string;
  intGoalDifference: string;
  intPoints: string;
  strTeamBadge?: string;
}

export function SportsWidget({ config }: { config: DiscoverConfig }) {
  const [results, setResults] = useState<TeamResult[]>([]);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSportsData = useCallback(async () => {
    if (config.sportsTeams.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const teamResults: TeamResult[] = [];
      const headers = { 'x-sports-key': config.apiKeys.sports || '3' };
      
      for (const team of config.sportsTeams) {
        // Fetch last match for basic result view
        const res = await fetch(`/api/sports?endpoint=last&team=${team.id}`, { headers });
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const last = data.results[0];
          const isHome = String(last.idHomeTeam) === String(team.id);
          
          teamResults.push({
            teamId: team.id,
            teamName: team.name,
            lastScore: `${last.intHomeScore ?? 0} - ${last.intAwayScore ?? 0}`,
            opponent: isHome ? last.strAwayTeam : last.strHomeTeam,
            isLive: last.strStatus === 'InProgress',
            status: last.strStatus === 'FT' ? 'Finished' : last.strStatus,
            date: last.dateEvent,
            leagueId: last.idLeague
          });
        }
      }

      setResults(teamResults);
      if (teamResults.length > 0 && !selectedTeam) {
        setSelectedTeam(teamResults[0]);
      }
    } catch (err: any) {
      setError(`Stadium Link Interrupted.`);
    } finally {
      setLoading(false);
    }
  }, [config.sportsTeams, config.apiKeys.sports, selectedTeam]);

  const fetchStandings = useCallback(async (leagueId: string) => {
    if (!leagueId) return;
    setStandingsLoading(true);
    try {
      const headers = { 'x-sports-key': config.apiKeys.sports || '3' };
      const res = await fetch(`/api/sports?endpoint=standings&league=${leagueId}`, { headers });
      const data = await res.json();
      setStandings(data.table || []);
    } catch (e) {
      console.warn("Standings fetch failed", e);
    } finally {
      setStandingsLoading(false);
    }
  }, [config.apiKeys.sports]);

  useEffect(() => {
    fetchSportsData();
  }, [fetchSportsData]);

  useEffect(() => {
    if (selectedTeam?.leagueId) {
      fetchStandings(selectedTeam.leagueId);
    }
  }, [selectedTeam, fetchStandings]);

  if (config.sportsTeams.length === 0) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
          <Trophy className="w-12 h-12 mb-2 opacity-30" />
          <p className="font-medium">Stadium Setup Required</p>
          <p className="text-xs">Add teams in discovery settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading && results.length === 0) return <div className="h-48 rounded-3xl-card animate-skeleton bg-muted/40" />;

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
              <div className="py-10 text-center space-y-2 text-destructive">
                <AlertCircle className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-sm font-bold">{error}</p>
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
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter bg-muted mb-1">
                    {result.status}
                  </span>
                  <p className="text-xl font-black tabular-nums">{result.lastScore}</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center space-y-2">
                <Trophy className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-bold text-muted-foreground">No fixtures found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-[2.5rem] border-none max-w-5xl bg-card p-0 overflow-hidden shadow-2xl flex h-[700px]">
        {/* Sidebar */}
        <div className="w-72 border-r bg-muted/5 p-6 flex flex-col gap-6">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">My Roster</h4>
            <div className="space-y-2">
              {results.map(res => (
                <button
                  key={res.teamId}
                  onClick={() => setSelectedTeam(res)}
                  className={cn(
                    "w-full p-4 rounded-2xl text-left transition-all font-bold text-sm flex items-center gap-3",
                    selectedTeam?.teamId === res.teamId 
                      ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]" 
                      : "hover:bg-primary/10 text-muted-foreground"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center text-xs">
                    {res.teamName[0]}
                  </div>
                  {res.teamName}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">Network Status</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Standings verified via TheSportsDB Community Network.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <DialogHeader className="p-8 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-headline font-black tracking-tight flex items-center gap-3">
                  <TableIcon className="w-8 h-8 text-primary" />
                  League Standing
                </DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground mt-1">
                  Verified ranking for {selectedTeam?.teamName}.
                </DialogDescription>
              </div>
              {standingsLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
            </div>
          </DialogHeader>

          <div className="flex-1 p-8 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {standings.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/30 rounded-t-xl sticky top-0 z-10">
                    <TableRow className="border-none">
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-center w-12">#</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider">Club</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-center">PL</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-center">W</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-center">D</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-center">L</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-center">GD</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-center">PTS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((entry) => (
                      <TableRow 
                        key={entry.strTeam} 
                        className={cn(
                          "border-b transition-colors",
                          entry.strTeam === selectedTeam?.teamName ? "bg-primary/5 font-bold" : "hover:bg-muted/20"
                        )}
                      >
                        <TableCell className="text-center font-black">{entry.intRank}</TableCell>
                        <TableCell className="flex items-center gap-3 py-4">
                          {entry.strTeamBadge && <img src={entry.strTeamBadge} alt="" className="w-6 h-6" />}
                          {entry.strTeam}
                        </TableCell>
                        <TableCell className="text-center font-medium">{entry.intPlayed}</TableCell>
                        <TableCell className="text-center text-green-600 font-bold">{entry.intWin}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{entry.intDraw}</TableCell>
                        <TableCell className="text-center text-red-600">{entry.intLoss}</TableCell>
                        <TableCell className="text-center font-mono">{entry.intGoalDifference}</TableCell>
                        <TableCell className="text-center font-black text-lg text-primary">{entry.intPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-40">
                  <TableIcon className="w-20 h-20 mb-4" />
                  <p className="text-lg font-bold">No Standing Signals Found</p>
                  <p className="text-sm">Standings require a TheSportsDB Patreon key or a supported league.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
