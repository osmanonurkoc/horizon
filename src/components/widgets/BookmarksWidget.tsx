"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Bookmark } from "lucide-react";
import { type DiscoverConfig } from "@/lib/config-store";

export function BookmarksWidget({ config }: { config: DiscoverConfig }) {
  if (config.bookmarks.length === 0) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex items-center justify-center h-24 text-muted-foreground p-6 italic">
          No bookmarks saved.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {config.bookmarks.map((b, i) => (
        <a 
          key={i} 
          href={b.url.startsWith('http') ? b.url : `https://${b.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[140px]"
        >
          <Card className="rounded-2xl-card hover:bg-secondary group transition-all duration-300 shadow-sm border-none bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-secondary/10 rounded-xl group-hover:bg-white/20">
                  <Bookmark className="w-5 h-5 text-secondary group-hover:text-white" />
                </div>
                <span className="font-bold text-foreground group-hover:text-white truncate">{b.name}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-white/70" />
            </CardContent>
          </Card>
        </a>
      ))}
    </div>
  );
}