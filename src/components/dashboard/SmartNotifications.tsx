
"use client";

import { type DiscoverConfig } from "@/lib/config-store";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, PlayCircle, Clock } from "lucide-react";

export function SmartNotifications({ config }: { config: DiscoverConfig }) {
  return (
    <div className="flex gap-6 justify-center overflow-x-auto pb-6 scrollbar-hide no-scrollbar w-full">
      {config.enabledWidgets.weather && config.location && (
        <Card className="flex-none w-[380px] rounded-3xl border-none bg-blue-500/10 border-l-4 border-l-blue-500 shadow-sm group hover:bg-blue-500/15 transition-all">
          <CardContent className="p-5 flex items-center gap-5">
            <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-md">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-0.5">Weather Alert</p>
              <p className="text-sm font-bold text-foreground/80 leading-snug">Clear skies expected in {config.location} all day.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {config.enabledWidgets.sports && config.sportsTeams.length > 0 && (
        <>
          <Card className="flex-none w-[380px] rounded-3xl border-none bg-red-500/10 border-l-4 border-l-red-500 shadow-sm group hover:bg-red-500/15 transition-all">
            <CardContent className="p-5 flex items-center gap-5">
              <div className="p-3 bg-red-500 rounded-2xl text-white relative shadow-md">
                <PlayCircle className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white dark:border-red-900"></span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest mb-0.5">Live Match</p>
                <p className="text-sm font-bold text-foreground/80 leading-snug">{config.sportsTeams[0]} is currently playing.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-none w-[380px] rounded-3xl border-none bg-card border-l-4 border-l-secondary shadow-sm group hover:bg-secondary/5 transition-all">
            <CardContent className="p-5 flex items-center gap-5">
              <div className="p-3 bg-secondary rounded-2xl text-white shadow-md">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-0.5">Upcoming Event</p>
                <p className="text-sm font-black text-secondary leading-snug">Next scheduled game in 24 hours.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
