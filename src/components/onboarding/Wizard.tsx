"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pill } from "@/components/ui/pill";
import { 
  HelpCircle, ArrowRight, ArrowLeft, Check, Plus, 
  Download, Upload, ChevronUp, ChevronDown, Monitor
} from "lucide-react";
import { 
  type DiscoverConfig, saveConfig, DEFAULT_CONFIG, getConfig, SEARCH_ENGINES, type SportsTeam 
} from "@/lib/config-store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AutocompletePillInput } from "@/components/ui/autocomplete-pill-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WizardProps {
  onComplete: (config: DiscoverConfig) => void;
}

export default function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<DiscoverConfig>(DEFAULT_CONFIG);
  const [tempBookmark, setTempBookmark] = useState({ name: '', url: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [locationResults, setLocationResults] = useState<string[]>([]);
  const [stockResults, setStockResults] = useState<string[]>([]);
  const [sportsResults, setSportsResults] = useState<SportsTeam[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = getConfig();
    if (stored) setConfig(stored);
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

  const fetchLocations = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q || q.length < 2) return;
    searchTimeout.current = setTimeout(async () => {
      if (!config.apiKeys.weather) return;
      setIsSearching(true);
      try {
        const url = `https://corsproxy.io/?https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${config.apiKeys.weather}`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) setLocationResults(data.map((l: any) => `${l.name}, ${l.country}`));
      } catch (e) {
        console.warn("Location fetch error:", e);
      } finally { setIsSearching(false); }
    }, 300);
  }, [config.apiKeys.weather]);

  const fetchStocks = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q || q.length < 1) return;
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = `https://corsproxy.io/?https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=5&newsCount=0`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.quotes) setStockResults(data.quotes.map((m: any) => `${m.symbol} (${m.shortname || m.longname || m.symbol})`));
      } catch (e) {
        console.warn("Stock fetch error:", e);
      } finally { setIsSearching(false); }
    }, 300);
  }, []);

  const fetchSports = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const sanitizedQ = q.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    if (!sanitizedQ || sanitizedQ.length < 2) return;
    
    searchTimeout.current = setTimeout(async () => {
      if (!config.apiKeys.sports) return;

      setIsSearching(true);
      try {
        const url = `https://corsproxy.io/?https://v3.football.api-sports.io/teams?search=${encodeURIComponent(sanitizedQ)}`;
        const res = await fetch(url, {
          headers: { "x-apisports-key": config.apiKeys.sports }
        });
        const data = await res.json();
        
        if (data.errors && Object.keys(data.errors).length > 0) {
          console.warn("API-Football Search Error:", Object.values(data.errors)[0]);
          return;
        }

        if (data?.response) {
          setSportsResults(data.response.map((r: any) => ({
            id: r.team.id,
            name: r.team.name,
            logo: r.team.logo
          })));
        }
      } catch (e: any) {
        console.warn("Sports search failed:", e);
      } finally { setIsSearching(false); }
    }, 500);
  }, [config.apiKeys.sports]);

  const finish = () => {
    saveConfig(config);
    onComplete(config);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8 font-body">
      <Card className="w-full max-w-3xl rounded-3xl-card overflow-hidden shadow-2xl border-none">
        <div className="flex justify-between items-center px-10 pt-6">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `horizon-config.json`;
              link.click();
            }} className="rounded-full gap-2 text-xs">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full gap-2 text-xs">
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <input type="file" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const imported = JSON.parse(event.target?.result as string);
                  setConfig({ ...DEFAULT_CONFIG, ...imported });
                } catch {}
              };
              reader.readAsText(file);
            }} className="hidden" accept=".json" />
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
                <Label className="text-base font-semibold">API Credentials</Label>
                {[
                  { id: 'weather', label: 'OpenWeather', link: 'https://home.openweathermap.org/users/sign_up', help: 'Get a free key at openweathermap.org', tip: 'Weather updates' },
                  { id: 'news', label: 'GNews API', link: 'https://gnews.io/register', help: 'Get a free key at gnews.io', tip: 'News masonry' },
                  { id: 'sports', label: 'API-Football', link: 'https://dashboard.api-football.com/register', help: 'Get a free key at api-football.com', tip: 'Live scores' }
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
                      className="rounded-xl h-12"
                      value={(config.apiKeys as any)[api.id] || ""}
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
              <Button onClick={nextStep} className="h-12 px-8 rounded-full text-lg gap-2 shadow-lg">
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
                  <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
                    <Label className="capitalize text-base font-bold">{key}</Label>
                    <Switch checked={enabled} onCheckedChange={() => handleToggle(key as any)} />
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                <Label className="text-base font-semibold block mb-4">Display Priority</Label>
                <div className="space-y-2">
                  {config.widgetOrder.map((name, idx) => (
                    <div key={`${name}-${idx}`} className="flex items-center justify-between bg-card border px-6 py-4 rounded-2xl shadow-sm group">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm">{idx + 1}</span>
                        <span className="capitalize font-bold text-lg">{name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => moveWidget('up', idx)} disabled={idx === 0}><ChevronUp /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveWidget('down', idx)} disabled={idx === config.widgetOrder.length - 1}><ChevronDown /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-10 pb-10 flex justify-between">
              <Button variant="ghost" onClick={prevStep} className="h-12 rounded-full px-6"><ArrowLeft className="mr-2" /> Back</Button>
              <Button onClick={nextStep} className="h-12 px-8 rounded-full text-lg gap-2">Continue <ArrowRight /></Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader className="pt-8 pb-6 px-10">
              <CardTitle className="text-3xl font-headline font-bold">Discovery Tuning</CardTitle>
              <CardDescription className="text-lg font-medium">Step 3: Dynamic data fetching and discovery.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 space-y-10 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
              
              {config.enabledWidgets.weather && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Base Location (Real-time)</Label>
                  <AutocompletePillInput 
                    options={locationResults}
                    values={config.location ? [config.location] : []}
                    onSearch={fetchLocations}
                    isLoading={isSearching}
                    onChange={(vals) => setConfig(c => ({ ...c, location: vals[0] || "" }))}
                    placeholder={config.apiKeys.weather ? "Search cities..." : "Add Weather API Key first"}
                    isMulti={false}
                  />
                </div>
              )}

              {config.enabledWidgets.sports && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Sports Teams (API-Football)</Label>
                  <AutocompletePillInput 
                    options={sportsResults.map(t => t.name)}
                    values={config.sportsTeams.map(t => t.name)}
                    onSearch={fetchSports}
                    isLoading={isSearching}
                    onChange={(vals) => {
                      const selectedNames = vals;
                      const newTeams = sportsResults.filter(t => selectedNames.includes(t.name));
                      const existingTeams = config.sportsTeams.filter(t => selectedNames.includes(t.name));
                      const combined = Array.from(new Map([...existingTeams, ...newTeams].map(t => [t.id, t])).values());
                      setConfig(c => ({ ...c, sportsTeams: combined }));
                    }}
                    placeholder={config.apiKeys.sports ? "Search teams..." : "Add Sports API Key first"}
                  />
                </div>
              )}

              {config.enabledWidgets.market && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Market Tickers (Global)</Label>
                  <AutocompletePillInput 
                    options={stockResults}
                    values={config.stocks}
                    onSearch={fetchStocks}
                    isLoading={isSearching}
                    onChange={(vals) => setConfig(c => ({ ...c, stocks: vals }))}
                    placeholder="Search tickers (e.g. AAPL, THYAO.IS)..."
                  />
                </div>
              )}

              {config.enabledWidgets.bookmarks && (
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-semibold">Fast Lanes (Bookmarks)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Name" value={tempBookmark.name} onChange={e => setTempBookmark(b => ({ ...b, name: e.target.value }))} />
                    <Input placeholder="URL" value={tempBookmark.url} onChange={e => setTempBookmark(b => ({ ...b, url: e.target.value }))} />
                    <Button onClick={() => {
                      if (tempBookmark.name && tempBookmark.url) {
                        setConfig(c => ({ ...c, bookmarks: [...c.bookmarks, tempBookmark] }));
                        setTempBookmark({ name: '', url: '' });
                      }
                    }}><Plus /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.bookmarks.map((b, i) => (
                      <Pill key={`${b.name}-${i}`} label={b.name} onRemove={() => setConfig(c => ({ ...c, bookmarks: config.bookmarks.filter((_, idx) => idx !== i) }))} />
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter className="px-10 pb-10 flex justify-between">
              <Button variant="ghost" onClick={prevStep} className="h-12 rounded-full px-6">Back</Button>
              <Button onClick={finish} className="h-12 px-10 rounded-full text-lg bg-secondary hover:bg-secondary/90 gap-2 shadow-xl">Launch Horizon <Check /></Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}