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
    
    // Simple check to see if onboarding was completed
    const hasBeenConfigured = stored.apiKeys.weather || stored.apiKeys.news || stored.bookmarks.length > 0;
    
    if (hasBeenConfigured) {
      setConfig(stored);
      // Requirement 2: Apply initial theme
      if (stored.theme === 'mocha') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
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
