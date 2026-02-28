"use client";

import { type DiscoverConfig } from "@/lib/config-store";
import { ClockSection } from "./ClockSection";
import { SmartNotifications } from "./SmartNotifications";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MarketWidget } from "@/components/widgets/MarketWidget";
import { SearchWidget } from "@/components/widgets/SearchWidget";
import { BookmarksWidget } from "@/components/widgets/BookmarksWidget";
import { SportsWidget } from "@/components/widgets/SportsWidget";
import { NewsFeed } from "./NewsFeed";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function Dashboard({ config, onOpenSettings }: { config: DiscoverConfig, onOpenSettings: () => void }) {
  const renderWidget = (name: string) => {
    if (!config.enabledWidgets[name as keyof DiscoverConfig['enabledWidgets']]) return null;

    switch (name) {
      case 'weather': return <WeatherWidget key={name} config={config} />;
      case 'market': return <MarketWidget key={name} config={config} />;
      case 'search': return <SearchWidget key={name} config={config} />;
      case 'bookmarks': return <BookmarksWidget key={name} config={config} />;
      case 'sports': return <SportsWidget key={name} config={config} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary/30">
      <div className="fixed top-6 right-6 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onOpenSettings}
          className="rounded-full h-12 w-12 bg-card/80 backdrop-blur shadow-lg border-none hover:rotate-90 transition-all duration-500"
        >
          <Settings className="w-6 h-6" />
        </Button>
      </div>

      <div className="container mx-auto max-w-7xl">
        <ClockSection config={config} />
        
        <div className="px-6 mb-12">
          <SmartNotifications config={config} />
        </div>

        <div className={`px-6 grid gap-6 ${config.layout === 'double' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {config.widgetOrder.map(renderWidget)}
        </div>

        {config.enabledWidgets.newsFeed && (
          <div className="px-6 mt-12">
            <h3 className="text-2xl font-headline font-black mb-6 flex items-center gap-3">
              Deep Dive <span className="text-muted-foreground font-normal text-sm uppercase tracking-widest">Global Updates</span>
            </h3>
            <NewsFeed config={config} />
          </div>
        )}
      </div>
    </div>
  );
}