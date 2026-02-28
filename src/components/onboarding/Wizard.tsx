
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pill } from "@/components/ui/pill";
import { 
  HelpCircle, ArrowRight, ArrowLeft, Check, Plus, 
  Download, Upload, ChevronUp, ChevronDown, Monitor, Info
} from "lucide-react";
import { 
  type DiscoverConfig, saveConfig, DEFAULT_CONFIG, getConfig, SEARCH_ENGINES 
} from "@/lib/config-store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AutocompletePillInput } from "@/components/ui/autocomplete-pill-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MOCK_DATA = {
  locations: [
    "London, UK", "New York, US", "Tokyo, JP", "Paris, FR", "Berlin, DE", "San Francisco, US", "Sydney, AU", "Toronto, CA",
    "Singapore, SG", "Dubai, AE", "Hong Kong, HK", "Seoul, KR", "Amsterdam, NL", "Stockholm, SE", "Oslo, NO", "Madrid, ES"
  ],
  stocks: [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK.B", "UNH", "V", "JNJ", "WMT", "JPM", "MA", "PG", "AVGO", 
    "ORCL", "HD", "CVX", "ABBV", "LLY", "MRK", "PEP", "KO", "BAC", "COST", "TMO", "AVGO", "CSCO", "ACN", "ABT", "ADBE"
  ],
  sports: [
    "Real Madrid", "Manchester City", "Bayern Munich", "Arsenal", "Paris Saint-Germain", "Barcelona", "Inter Milan", 
    "Liverpool", "Bayer Leverkusen", "Atletico Madrid", "Borussia Dortmund", "Juventus", "AC Milan", "Napoli", 
    "Benfica", "Porto", "Ajax", "PSV Eindhoven", "Sporting CP", "Aston Villa", "Tottenham Hotspur", "Chelsea", 
    "Manchester United", "Newcastle United", "Lazio", "Roma", "Feyenoord", "Galatasaray", "Fenerbahce"
  ],
  topics: [
    "Technology", "Artificial Intelligence", "Finance", "Space Exploration", "Climate Change", "Cybersecurity", 
    "Health & Wellness", "Global Economy", "Renewable Energy", "Quantum Computing", "Electric Vehicles", 
    "Sustainability", "Venture Capital", "Biotechnology", "Robotics", "E-commerce", "Semiconductors"
  ],
  languages: ["en", "es", "fr", "de", "it", "ja", "ko", "pt", "ru", "zh"]
};

interface WizardProps {
  onComplete: (config: DiscoverConfig) => void;
}

export default function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<DiscoverConfig>(DEFAULT_CONFIG);
  const [tempBookmark, setTempBookmark] = useState({ name: '', url: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = getConfig();
    if (stored) {
      setConfig(stored);
    }
  }, []);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleToggle = (key: keyof DiscoverConfig['enabledWidgets']) => {
    setConfig(prev => ({
      ...prev,
      enabledWidgets: { ...prev.enabledWidgets, [key]: !prev.enabledWidgets[key] }
    }));
  };

  const moveWidget = (direction: 'up' | 'down', index: number) => {
    const newOrder = [...config.widgetOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setConfig(prev => ({ ...prev, widgetOrder: newOrder }));
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horizon-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        const merged = { ...DEFAULT_CONFIG, ...imported };
        setConfig(merged);
        saveConfig(merged);
      } catch (err) {
        alert("Failed to parse configuration file.");
      }
    };
    reader.readAsText(file);
  };

  const finish = () => {
    saveConfig(config);
    onComplete(config);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8 font-body">
      <Card className="w-full max-w-3xl rounded-3xl-card overflow-hidden shadow-2xl border-none">
        <div className="flex justify-between items-center px-10 pt-6">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={exportConfig} className="rounded-full gap-2 text-xs">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full gap-2 text-xs">
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <input type="file" ref={fileInputRef} onChange={importConfig} className="hidden" accept=".json" />
          </div>
          <div className="flex gap-1 h-1.5 w-32 bg-muted rounded-full overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex-1 transition-all ${step >= i ? 'bg-primary' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <CardHeader className="pt-8 pb-6 px-10">
              <CardTitle className="text-3xl font-headline font-bold text-foreground">Layout & Connectivity</CardTitle>
              <CardDescription className="text-lg font-medium">Step 1: Interface preferences and data keys.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Layout Mode</Label>
                  <div className="flex gap-4">
                    <Button 
                      variant={config.layout === 'single' ? 'default' : 'outline'}
                      onClick={() => setConfig(c => ({ ...c, layout: 'single' }))}
                      className="flex-1 h-14 rounded-2xl gap-2"
                    >
                      <Monitor className="w-4 h-4" /> Single
                    </Button>
                    <Button 
                      variant={config.layout === 'double' ? 'default' : 'outline'}
                      onClick={() => setConfig(c => ({ ...c, layout: 'double' }))}
                      className="flex-1 h-14 rounded-2xl gap-2"
                    >
                      <Monitor className="w-4 h-4" /> Double
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Search Engine</Label>
                  <Select 
                    value={config.searchEngine} 
                    onValueChange={(val) => setConfig(c => ({ ...c, searchEngine: val }))}
                  >
                    <SelectTrigger className="h-14 rounded-2xl">
                      <SelectValue placeholder="Select search engine" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {SEARCH_ENGINES.map(engine => (
                        <SelectItem key={engine.url} value={engine.url}>{engine.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">API Credentials</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    <Info className="w-3 h-3" />
                    <span>Keys are stored locally only</span>
                  </div>
                </div>
                
                {[
                  { id: 'weather', label: 'OpenWeather', link: 'https://home.openweathermap.org/users/sign_up', help: 'Get a free key at openweathermap.org', tip: 'Powers local weather updates' },
                  { id: 'news', label: 'Mediastack', link: 'https://mediastack.com/signup/free', help: 'Get a free key at mediastack.com', tip: 'Feeds the "Deep Dive" global news stream' },
                  { id: 'market', label: 'Alpha Vantage', link: 'https://www.alphavantage.co/support/#api-key', help: 'Get a free key at alphavantage.co', tip: 'Provides real-time stock and market data' }
                ].map((api) => (
                  <div key={api.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={api.id} className="font-bold">{api.label} API Key</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a href={api.link} target="_blank" rel="noopener noreferrer">
                                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-lg">{api.help}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">{api.tip}</span>
                    </div>
                    <Input 
                      id={api.id}
                      type="password"
                      placeholder="Paste your key here..."
                      className="rounded-xl h-12 border-muted-foreground/20 focus:border-primary"
                      value={(config.apiKeys as any)[api.id]}
                      onChange={(e) => setConfig(c => ({
                        ...c,
                        apiKeys: { ...c.apiKeys, [api.id]: e.target.value }
                      }))}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="px-10 pb-10 justify-end">
              <Button onClick={nextStep} className="h-12 px-8 rounded-full text-lg gap-2 shadow-lg hover:shadow-xl transition-all">
                Continue <ArrowRight className="w-5 h-5" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="pt-8 pb-6 px-10">
              <CardTitle className="text-3xl font-headline font-bold">Widget Hierarchy</CardTitle>
              <CardDescription className="text-lg font-medium">Step 2: Selection and display priority.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(config.enabledWidgets).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border-none transition-colors hover:bg-muted/30">
                    <Label className="capitalize text-base font-bold">{key}</Label>
                    <Switch 
                      checked={enabled}
                      onCheckedChange={() => handleToggle(key as any)}
                    />
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                <Label className="text-base font-semibold block mb-4">Display Priority (Click arrows to reorder)</Label>
                <div className="space-y-2">
                  {config.widgetOrder.map((name, idx) => (
                    <div key={name} className="flex items-center justify-between bg-card border px-6 py-4 rounded-2xl shadow-sm group">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm">{idx + 1}</span>
                        <span className="capitalize font-bold text-lg">{name}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => moveWidget('up', idx)}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => moveWidget('down', idx)}
                          disabled={idx === config.widgetOrder.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-10 pb-10 flex justify-between">
              <Button variant="ghost" onClick={prevStep} className="h-12 rounded-full px-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
              <Button onClick={nextStep} className="h-12 px-8 rounded-full text-lg gap-2 shadow-lg">
                Continue <ArrowRight className="w-5 h-5" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader className="pt-8 pb-6 px-10">
              <CardTitle className="text-3xl font-headline font-bold">Personalized Discovery</CardTitle>
              <CardDescription className="text-lg font-medium">Step 3: Feed customization with expanded suggestions.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 space-y-10 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
              
              {config.enabledWidgets.weather && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Base Location</Label>
                  <AutocompletePillInput 
                    options={MOCK_DATA.locations}
                    values={config.location ? [config.location] : []}
                    onChange={(vals) => setConfig(c => ({ ...c, location: vals[0] || "" }))}
                    placeholder="Search city..."
                    isMulti={false}
                  />
                </div>
              )}

              {config.enabledWidgets.newsFeed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Interest Topics</Label>
                    <AutocompletePillInput 
                      options={MOCK_DATA.topics}
                      values={config.newsTopics}
                      onChange={(vals) => setConfig(c => ({ ...c, newsTopics: vals }))}
                      placeholder="Add topic..."
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Feed Languages</Label>
                    <AutocompletePillInput 
                      options={MOCK_DATA.languages}
                      values={config.newsLanguages}
                      onChange={(vals) => setConfig(c => ({ ...c, newsLanguages: vals }))}
                      placeholder="Add language..."
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {config.enabledWidgets.market && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Market Tickers (Alpha Vantage)</Label>
                    <AutocompletePillInput 
                      options={MOCK_DATA.stocks}
                      values={config.stocks}
                      onChange={(vals) => setConfig(c => ({ ...c, stocks: vals }))}
                      placeholder="Add symbol..."
                    />
                  </div>
                )}
                {config.enabledWidgets.sports && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Stadium Teams (Global Clubs)</Label>
                    <AutocompletePillInput 
                      options={MOCK_DATA.sports}
                      values={config.sportsTeams}
                      onChange={(vals) => setConfig(c => ({ ...c, sportsTeams: vals }))}
                      placeholder="Add team..."
                    />
                  </div>
                )}
              </div>

              {config.enabledWidgets.bookmarks && (
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-semibold">Fast Lanes (Bookmarks)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Name" 
                      className="rounded-xl h-12"
                      value={tempBookmark.name}
                      onChange={e => setTempBookmark(b => ({ ...b, name: e.target.value }))}
                    />
                    <Input 
                      placeholder="URL" 
                      className="rounded-xl h-12"
                      value={tempBookmark.url}
                      onChange={e => setTempBookmark(b => ({ ...b, url: e.target.value }))}
                    />
                    <Button 
                      className="rounded-xl h-12 px-5"
                      onClick={() => {
                        if (tempBookmark.name && tempBookmark.url) {
                          setConfig(c => ({ ...c, bookmarks: [...c.bookmarks, tempBookmark] }));
                          setTempBookmark({ name: '', url: '' });
                        }
                      }}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.bookmarks.map((b, i) => (
                      <Pill key={i} label={b.name} onRemove={() => setConfig(c => ({ ...c, bookmarks: c.bookmarks.filter((_, idx) => idx !== i) }))} />
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter className="px-10 pb-10 flex justify-between">
              <Button variant="ghost" onClick={prevStep} className="h-12 rounded-full px-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
              <Button onClick={finish} className="h-12 px-10 rounded-full text-lg bg-secondary hover:bg-secondary/90 gap-2 shadow-xl hover:scale-105 transition-all">
                Launch Horizon <Check className="w-5 h-5" />
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
