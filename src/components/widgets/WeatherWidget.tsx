"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, Thermometer, Wind, Droplets } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { type DiscoverConfig } from "@/lib/config-store";

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

  if (loading) {
    return <div className="h-48 rounded-3xl-card animate-skeleton bg-muted/40" />;
  }

  if (error) {
    return (
      <Card className="rounded-3xl-card border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center h-48 text-destructive p-6 text-center">
          <Thermometer className="w-12 h-12 mb-2 opacity-50" />
          <p className="font-bold">Weather Unavailable</p>
          <p className="text-xs">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear': return <Sun className="w-16 h-16 text-yellow-500" />;
      case 'clouds': return <Cloud className="w-16 h-16 text-blue-400" />;
      case 'rain': return <CloudRain className="w-16 h-16 text-blue-600" />;
      default: return <Cloud className="w-16 h-16 text-muted-foreground" />;
    }
  };

  return (
    <Card className="rounded-3xl-card bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">{data?.city}</CardTitle>
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
  );
}