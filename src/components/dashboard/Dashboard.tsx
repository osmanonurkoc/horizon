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
import { Settings, Moon, Sun } from "lucide-react";

export default function Dashboard({ config, onOpenSettings }: { config: DiscoverConfig, onOpenSettings: () => void }) {
  const [currentTheme, setCurrentTheme] = useState(config.theme);

  // Requirement 2: Theme Switcher
  const toggleTheme = () => {
    const newTheme = currentTheme === 'latte' ? 'mocha' : 'latte';
    setCurrentTheme(newTheme);
    const updatedConfig = { ...config, theme: newTheme };
    saveConfig(updatedConfig);
  };

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
    <div className="min-h-screen bg-background pb-20 selection:bg-primary/30 transition-colors duration-500">
      {/* Header Utilities */}
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        {/* Requirement 2: Sun/Moon Theme Toggle */}
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
        <ClockSection config={config} />
        
        <div className="px-6 mb-12">
          <SmartNotifications config={config} />
        </div>

        {/* Respecting widgetOrder precisely */}
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
