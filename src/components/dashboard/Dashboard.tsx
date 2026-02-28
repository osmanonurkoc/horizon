
"use client";

import { useState, useCallback, useEffect } from "react";
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
  const [autoRefreshKey, setAutoRefreshKey] = useState(0);

  // Auto-refresh every 2 hours (excluding news feed)
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoRefreshKey(prev => prev + 1);
    }, 2 * 60 * 60 * 1000); // 7,200,000ms
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'latte' ? 'mocha' : 'latte';
    setCurrentTheme(newTheme);
    const updatedConfig = { ...config, theme: newTheme };
    saveConfig(updatedConfig);
  };

  const handleRefresh = () => {
    // Nuclear cache clear for all horizon keys
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    setRefreshKey(prev => prev + 1);
  };

  const renderWidget = (name: string) => {
    if (!config.enabledWidgets[name as keyof DiscoverConfig['enabledWidgets']]) return null;

    // Use combined key for auto-refreshing widgets
    const widgetKey = `${name}-${refreshKey}-${autoRefreshKey}`;

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
    <div className="min-h-screen bg-background pb-20 selection:bg-primary/30 transition-colors duration-500">
      {/* Header Utilities */}
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        {/* Global Refresh Button */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefresh}
          title="Refresh Horizon"
          className="rounded-full h-12 w-12 bg-card/80 backdrop-blur shadow-lg border-none transition-all duration-300 hover:scale-110 active:scale-95 group"
        >
          <RefreshCcw className="w-6 h-6 group-active:rotate-180 transition-transform duration-500" />
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleTheme}
          className="rounded-full h-12 w-12 bg-card/80 backdrop-blur shadow-lg border-none transition-all duration-300 hover:scale-110 active:scale-95"
        >
          {currentTheme === 'latte' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
        </Button>

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
        <ClockSection config={config} refreshKey={refreshKey + autoRefreshKey} />
        
        <div className="px-6 mb-12 flex justify-center">
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
            {/* News feed only refreshes manually */}
            <NewsFeed key={`news-${refreshKey}`} config={config} />
          </div>
        )}
      </div>
    </div>
  );
}
