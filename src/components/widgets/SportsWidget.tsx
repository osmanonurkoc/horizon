"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowRight, ShieldCheck } from "lucide-react";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function SportsWidget({ config }: { config: DiscoverConfig }) {
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
    <Dialog>
      <DialogTrigger asChild>
        <Card className="rounded-3xl-card bg-card overflow-hidden cursor-pointer group hover:border-primary/50 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Stadium Central</CardTitle>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {config.sportsTeams.slice(0, 3).map((team, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary font-black text-xl">
                    {team[0]}
                  </div>
                  <div>
                    <p className="font-black font-headline text-lg group-hover:text-primary transition-colors">{team}</p>
                    <p className="text-xs text-muted-foreground uppercase font-bold">Main League</p>
                  </div>
                </div>
                
                {i === 0 ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="pulsating-dot" />
                      <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full">LIVE</span>
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
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold">Club News & Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-2">Form Guide</h4>
            <div className="flex gap-2">
              {['W', 'W', 'D', 'W', 'L'].map((res, i) => (
                <div key={i} className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-sm",
                  res === 'W' ? 'bg-green-500' : res === 'D' ? 'bg-orange-400' : 'bg-red-500'
                )}>
                  {res}
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 bg-secondary/5 rounded-3xl border border-secondary/10 space-y-4">
            <h4 className="font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-secondary" /> Squad Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <span className="block font-bold">Injuries</span>
                <span className="text-muted-foreground text-xs">2 Key players out</span>
              </div>
              <div className="text-sm">
                <span className="block font-bold">Discipline</span>
                <span className="text-muted-foreground text-xs">No active bans</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Upcoming Fixtures</h4>
            {[
              { opponent: 'Paris SC', date: 'Oct 24, 21:00' },
              { opponent: 'Berlin Utd', date: 'Oct 28, 15:30' }
            ].map((fix, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-muted/20 rounded-2xl hover:bg-muted/30 transition-colors">
                <span className="font-bold">{fix.opponent}</span>
                <span className="text-[10px] opacity-60 font-bold uppercase">{fix.date}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
