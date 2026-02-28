"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Calendar } from "lucide-react";
import { type DiscoverConfig } from "@/lib/config-store";

export function SportsWidget({ config }: { config: DiscoverConfig }) {
  // In a real app, this would fetch from an API like OddsAPI or Football-Data.org
  // Using mock data for configured teams
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

  return (
    <Card className="rounded-3xl-card bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Stadium Central</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {config.sportsTeams.slice(0, 3).map((team, i) => (
          <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary font-black text-xl">
                {team[0]}
              </div>
              <div>
                <p className="font-black font-headline text-lg">{team}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Premier League</p>
              </div>
            </div>
            
            {i === 0 ? (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1">
                  <div className="pulsating-dot" />
                  <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full">LIVE</span>
                </div>
                <p className="text-xl font-black tabular-nums">2 - 1</p>
              </div>
            ) : (
              <div className="flex flex-col items-end text-right">
                <p className="text-sm font-bold">Tomorrow</p>
                <p className="text-xs text-muted-foreground">19:45 PM</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}