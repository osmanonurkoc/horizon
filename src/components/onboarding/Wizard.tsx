"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pill } from "@/components/ui/pill";
import { HelpCircle, ArrowRight, ArrowLeft, Check, Plus } from "lucide-react";
import { type DiscoverConfig, saveConfig, DEFAULT_CONFIG } from "@/lib/config-store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WizardProps {
  onComplete: (config: DiscoverConfig) => void;
}

export default function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<DiscoverConfig>(DEFAULT_CONFIG);
  const [tempBookmark, setTempBookmark] = useState({ name: '', url: '' });
  const [tempInput, setTempInput] = useState<{ [key: string]: string }>({ news: '', stocks: '', teams: '' });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleToggle = (key: keyof DiscoverConfig['enabledWidgets']) => {
    setConfig(prev => ({
      ...prev,
      enabledWidgets: { ...prev.enabledWidgets, [key]: !prev.enabledWidgets[key] }
    }));
  };

  const addPill = (field: 'newsTopics' | 'stocks' | 'sportsTeams', key: string) => {
    const val = tempInput[key].trim();
    if (!val) return;
    setConfig(prev => ({
      ...prev,
      [field]: [...new Set([...prev[field], val])]
    }));
    setTempInput(prev => ({ ...prev, [key]: '' }));
  };

  const removePill = (field: 'newsTopics' | 'stocks' | 'sportsTeams', val: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== val)
    }));
  };

  const finish = () => {
    saveConfig(config);
    onComplete(config);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8 font-body">
      <Card className="w-full max-w-2xl rounded-3xl-card overflow-hidden shadow-2xl border-none">
        <div className="h-2 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${(step / 3) * 100}%` }} 
          />
        </div>

        {step === 1 && (
          <>
            <CardHeader className="pt-10 pb-6 px-10">
              <CardTitle className="text-3xl font-headline font-bold text-foreground">Welcome to Personal Horizon</CardTitle>
              <CardDescription className="text-lg">Step 1: Layout & APIs. Bring your own data keys.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 space-y-8">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Layout Mode</Label>
                <div className="flex gap-4">
                  <Button 
                    variant={config.layout === 'single' ? 'default' : 'outline'}
                    onClick={() => setConfig(c => ({ ...c, layout: 'single' }))}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    Single Column
                  </Button>
                  <Button 
                    variant={config.layout === 'double' ? 'default' : 'outline'}
                    onClick={() => setConfig(c => ({ ...c, layout: 'double' }))}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    Double Column
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">API Configuration</Label>
                  <p className="text-xs text-muted-foreground max-w-[200px] text-right">Keys are stored locally in your browser.</p>
                </div>
                
                {[
                  { id: 'weather', label: 'OpenWeather API Key', link: 'https://home.openweathermap.org/users/sign_up' },
                  { id: 'news', label: 'GNews API Key', link: 'https://gnews.io/register' },
                  { id: 'market', label: 'Alpha Vantage API Key', link: 'https://www.alphavantage.co/support/#api-key' }
                ].map((api) => (
                  <div key={api.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={api.id}>{api.label}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a href={api.link} target="_blank" rel="noopener noreferrer">
                              <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary cursor-help" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>Click to get a free API key</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input 
                      id={api.id}
                      type="password"
                      placeholder="Enter your key..."
                      className="rounded-xl h-12"
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
              <Button onClick={nextStep} className="h-12 px-8 rounded-full text-lg gap-2">
                Continue <ArrowRight className="w-5 h-5" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="pt-10 pb-6 px-10">
              <CardTitle className="text-3xl font-headline font-bold">Widgets & Order</CardTitle>
              <CardDescription className="text-lg">Step 2: Choose which widgets you want to see.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(config.enabledWidgets).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                    <Label className="capitalize text-base font-medium">{key}</Label>
                    <Switch 
                      checked={enabled}
                      onCheckedChange={() => handleToggle(key as any)}
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-8 space-y-4">
                <Label className="text-base font-semibold">Display Priority (First to Last)</Label>
                <div className="flex flex-wrap gap-2">
                  {config.widgetOrder.map((name, idx) => (
                    <div key={name} className="flex items-center gap-2 bg-card border px-4 py-2 rounded-xl shadow-sm">
                      <span className="text-sm font-bold text-primary">{idx + 1}</span>
                      <span className="capitalize">{name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Order is managed automatically for optimal flow.</p>
              </div>
            </CardContent>
            <CardFooter className="px-10 pb-10 flex justify-between">
              <Button variant="ghost" onClick={prevStep} className="h-12 rounded-full px-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
              <Button onClick={nextStep} className="h-12 px-8 rounded-full text-lg gap-2">
                Continue <ArrowRight className="w-5 h-5" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader className="pt-10 pb-6 px-10">
              <CardTitle className="text-3xl font-headline font-bold">Personalize Your Content</CardTitle>
              <CardDescription className="text-lg">Step 3: Tell us what you care about.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 space-y-8 max-h-[500px] overflow-y-auto">
              
              {config.enabledWidgets.weather && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Weather Location</Label>
                  <Input 
                    placeholder="City Name (e.g. London, US)"
                    className="rounded-xl h-12"
                    value={config.location}
                    onChange={(e) => setConfig(c => ({ ...c, location: e.target.value }))}
                  />
                </div>
              )}

              {config.enabledWidgets.bookmarks && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Quick Bookmarks</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Name" 
                      className="rounded-xl"
                      value={tempBookmark.name}
                      onChange={e => setTempBookmark(b => ({ ...b, name: e.target.value }))}
                    />
                    <Input 
                      placeholder="URL" 
                      className="rounded-xl"
                      value={tempBookmark.url}
                      onChange={e => setTempBookmark(b => ({ ...b, url: e.target.value }))}
                    />
                    <Button 
                      className="rounded-xl px-3"
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

              {config.enabledWidgets.newsFeed && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">News Topics</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Topic (e.g. AI, Science)"
                      className="rounded-xl"
                      value={tempInput.news}
                      onChange={e => setTempInput(t => ({ ...t, news: e.target.value }))}
                    />
                    <Button onClick={() => addPill('newsTopics', 'news')} className="rounded-xl px-3">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.newsTopics.map(t => (
                      <Pill key={t} label={t} onRemove={() => removePill('newsTopics', t)} />
                    ))}
                  </div>
                </div>
              )}

              {(config.enabledWidgets.market || config.enabledWidgets.sports) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {config.enabledWidgets.market && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Stocks (Symbols)</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="AAPL, TSLA..."
                          className="rounded-xl"
                          value={tempInput.stocks}
                          onChange={e => setTempInput(t => ({ ...t, stocks: e.target.value.toUpperCase() }))}
                        />
                        <Button onClick={() => addPill('stocks', 'stocks')} className="rounded-xl px-3">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.stocks.map(s => (
                          <Pill key={s} label={s} onRemove={() => removePill('stocks', s)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {config.enabledWidgets.sports && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Sports Teams</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Team Name..."
                          className="rounded-xl"
                          value={tempInput.teams}
                          onChange={e => setTempInput(t => ({ ...t, teams: e.target.value }))}
                        />
                        <Button onClick={() => addPill('sportsTeams', 'teams')} className="rounded-xl px-3">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.sportsTeams.map(t => (
                          <Pill key={t} label={t} onRemove={() => removePill('sportsTeams', t)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
            <CardFooter className="px-10 pb-10 flex justify-between">
              <Button variant="ghost" onClick={prevStep} className="h-12 rounded-full px-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
              <Button onClick={finish} className="h-12 px-10 rounded-full text-lg bg-secondary hover:bg-secondary/90 gap-2">
                Launch Dashboard <Check className="w-5 h-5" />
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}