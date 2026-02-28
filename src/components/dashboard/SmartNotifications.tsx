"use client";

import { type DiscoverConfig } from "@/lib/config-store";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, PlayCircle, Clock } from "lucide-react";

export function SmartNotifications({ config }: { config: DiscoverConfig }) {
  // Center the entire container of cards using justify-center
  return (
    <div className="flex gap-4 justify-center overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
      {config.enabledWidgets.weather && config.location && (
        <Card className="flex-none w-[350px] rounded-2xl border-none bg-blue-500/10 border-l-4 border-l-blue-500 shadow-sm group hover:bg-blue-500/15 transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-500 rounded-xl text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Weather Alert</p>
              <p className="text-sm font-medium text-foreground/80">Clear skies expected in {config.location} all day.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {config.enabledWidgets.sports && config.sportsTeams.length > 0 && (
        <>
          <Card className="flex-none w-[350px] rounded-2xl border-none bg-red-500/10 border-l-4 border-l-red-500 shadow-sm group hover:bg-red-500/15 transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-red-500 rounded-xl text-white relative">
                <PlayCircle className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest">Live Match</p>
                <p className="text-sm font-medium text-foreground/80">{config.sportsTeams[0]} is currently playing.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-none w-[350px] rounded-2xl border-none bg-card border-l-4 border-l-secondary shadow-sm group hover:bg-secondary/5 transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 bg-secondary rounded-xl text-white">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Upcoming</p>
                <p className="text-sm font-bold text-secondary">Next game in 24 hours.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
