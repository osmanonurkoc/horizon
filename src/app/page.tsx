"use client";

import { useEffect, useState } from "react";
import Wizard from "@/components/onboarding/Wizard";
import Dashboard from "@/components/dashboard/Dashboard";
import { type DiscoverConfig, getConfig } from "@/lib/config-store";

export default function Home() {
  const [config, setConfig] = useState<DiscoverConfig | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const stored = getConfig();
    // A simplified check to see if onboarding was completed
    // If they have no API keys and no bookmarks, it's likely first run
    const hasBeenConfigured = stored.apiKeys.weather || stored.apiKeys.news || stored.bookmarks.length > 0;
    
    if (hasBeenConfigured) {
      setConfig(stored);
    }
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  if (!config || isSettingsOpen) {
    return (
      <Wizard 
        onComplete={(newConfig) => {
          setConfig(newConfig);
          setIsSettingsOpen(false);
        }} 
      />
    );
  }

  return (
    <Dashboard 
      config={config} 
      onOpenSettings={() => setIsSettingsOpen(true)} 
    />
  );
}