"use client";

import { useState, useEffect } from "react";
import { type DiscoverConfig, saveConfig } from "@/lib/config-store";
import { ClockSection } from "./ClockSection";
import { SmartNotifications } from "./SmartNotifications";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MarketWidget } from "@/components/widgets/MarketWidget";
import { SearchWidget } from "@/components/widgets/SearchWidget";
import { BookmarksWidget } from "@/components/widgets/BookmarksWidget";
import { SportsWidget } from "@/components/widgets/SportsWidget";
import { NewsFeed } from "./NewsFeed";
import { Button } from "@/components/ui/button";
import { Settings, Moon, Sun, RefreshCcw } from "lucide-react";

export default function Dashboard({ config, onOpenSettings }: { config: DiscoverConfig, onOpenSettings: () => void }) {
  const [currentTheme, setCurrentTheme] = useState(config.theme);
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'latte' ? 'mocha' : 'latte';
    setCurrentTheme(newTheme);
    const updatedConfig = { ...config, theme: newTheme };
    saveConfig(updatedConfig);
  };

  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      // Clear specific horizon cache keys only
      Object.keys(localStorage)
        .filter(key => key.startsWith('horizon_cache_') || key.startsWith('sports_fixtures_'))
        .forEach(key => localStorage.removeItem(key));
    }
    setRefreshKey(prev => prev + 1);
  };

  const renderWidget = (name: string) => {
    if (!config.enabledWidgets[name as keyof DiscoverConfig['enabledWidgets']]) return null;
    const widgetKey = `${name}-${refreshKey}`;

    switch (name) {
      case 'weather': return <WeatherWidget key={widgetKey} config={config} />;
      case 'market': return <MarketWidget key={widgetKey} config={config} />;
      case 'search': return <SearchWidget key={name} config={config} />;
      case 'bookmarks': return <BookmarksWidget key={name} config={config} />;
      case 'sports': return <SportsWidget key={widgetKey} config={config} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 selection:bg-primary/30 transition-colors duration-500">
      {/* Utility Toolbar */}
      <div className="fixed top-8 right-8 z-50 flex gap-3">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefresh}
          className="rounded-full h-12 w-12 bg-card/80 backdrop-blur shadow-xl border-none transition-all hover:scale-110 active:scale-95 group"
        >
          <RefreshCcw className="w-6 h-6 group-active:rotate-180 transition-transform duration-500" />
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleTheme}
          className="rounded-full h-12 w-12 bg-card/80 backdrop-blur shadow-xl border-none transition-all hover:scale-110 active:scale-95"
        >
          {currentTheme === 'latte' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={onOpenSettings}
          className="rounded-full h-12 w-12 bg-card/80 backdrop-blur shadow-xl border-none hover:rotate-90 transition-all duration-500"
        >
          <Settings className="w-6 h-6" />
        </Button>
      </div>

      <div className="container mx-auto max-w-[1400px]">
        <ClockSection config={config} refreshKey={refreshKey} />
        
        <SmartNotifications config={config} />

        <div className={`px-6 grid gap-8 ${config.layout === 'double' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {config.widgetOrder.map(renderWidget)}
        </div>

        {config.enabledWidgets.newsFeed && (
          <div className="px-6 mt-20">
            <h3 className="text-3xl font-headline font-black mb-10 flex items-center gap-4">
              Deep Dive <span className="text-muted-foreground font-normal text-sm uppercase tracking-[0.3em]">Global Updates</span>
            </h3>
            <NewsFeed key={`news-${refreshKey}`} config={config} />
          </div>
        )}
      </div>
    </div>
  );
}
