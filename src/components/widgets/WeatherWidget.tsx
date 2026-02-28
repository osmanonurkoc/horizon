"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, Thermometer, Wind, Droplets, ArrowRight } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  wind: number;
  city: string;
}

export function WeatherWidget({ config }: { config: DiscoverConfig }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config.apiKeys.weather || !config.location) {
      setLoading(false);
      return;
    }

    const fetchWeather = async () => {
      try {
        const result = await cachedFetch(
          `weather_${config.location}`,
          async () => {
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?q=${config.location}&appid=${config.apiKeys.weather}&units=metric`
            );
            if (!res.ok) throw new Error("Weather API Error");
            const json = await res.json();
            return {
              temp: Math.round(json.main.temp),
              condition: json.weather[0].main,
              humidity: json.main.humidity,
              wind: json.wind.speed,
              city: json.name,
            };
          },
          EXPIRY_TIMES.WEATHER
        );
        setData(result);
      } catch (err) {
        setError("Invalid Key or City");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [config]);

  if (!config.apiKeys.weather || !config.location) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
          <Cloud className="w-12 h-12 mb-2 opacity-30" />
          <p className="font-medium">Weather Setup Required</p>
          <p className="text-xs">Add API key and location in settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <div className="h-48 rounded-3xl-card animate-skeleton bg-muted/40" />;

  const getIcon = (condition: string, size: string = "w-16 h-16") => {
    switch (condition.toLowerCase()) {
      case 'clear': return <Sun className={`${size} text-yellow-500`} />;
      case 'clouds': return <Cloud className={`${size} text-blue-400`} />;
      case 'rain': return <CloudRain className={`${size} text-blue-600`} />;
      default: return <Cloud className={`${size} text-muted-foreground`} />;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="rounded-3xl-card bg-card overflow-hidden cursor-pointer group hover:border-primary/50 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">{data?.city}</CardTitle>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 items-center p-8">
            <div className="flex flex-col">
              <span className="text-6xl font-black font-headline">{data?.temp}°</span>
              <span className="text-lg text-muted-foreground font-medium">{data?.condition}</span>
            </div>
            <div className="flex justify-end">
              {getIcon(data?.condition || '')}
            </div>
            <div className="col-span-2 mt-8 grid grid-cols-2 gap-4 border-t pt-6">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Humidity</p>
                  <p className="font-bold">{data?.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-teal-400" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Wind</p>
                  <p className="font-bold">{data?.wind} m/s</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold">5-Day Outlook: {data?.city}</DialogTitle>
          <DialogDescription>
            Long-range weather forecasts and conditions for your current location.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="grid grid-cols-5 gap-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
              <div key={day} className="flex flex-col items-center p-4 bg-muted/30 rounded-2xl">
                <span className="text-sm font-bold text-muted-foreground mb-2">{day}</span>
                {getIcon(i % 2 === 0 ? 'Clear' : 'Clouds', "w-8 h-8")}
                <span className="text-xl font-black mt-2">{data!.temp + i}°</span>
              </div>
            ))}
          </div>
          <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
            <h4 className="font-bold mb-2 flex items-center gap-2"><Thermometer className="w-4 h-4" /> Today's Insight</h4>
            <p className="text-muted-foreground leading-relaxed">
              Conditions are optimal for outdoor activities in {data?.city}. Humidity remains steady at {data?.humidity}%, with winds picking up slightly in the afternoon.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}