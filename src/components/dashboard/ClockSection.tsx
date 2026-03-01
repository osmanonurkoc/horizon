"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { type DiscoverConfig, convertConfigToBriefingInput } from "@/lib/config-store";
import { generatePersonalizedBriefing } from "@/ai/flows/personalized-briefing";
import { Sparkles } from "lucide-react";

const EASTER_EGGS = [
  "Ready to push some flawless code today?",
  "Time to fire up the 3D renderer and craft something amazing.",
  "Don't forget your lean muscle workout today! Stay slim and strong.",
  "Another perfect day for open-source contributions.",
  "Ready to design some fresh UI themes?",
  "Boot up the pen display, it's time to draw.",
  "Welcome back. Your dashboard is ready."
];

export function ClockSection({ config, refreshKey = 0 }: { config: DiscoverConfig, refreshKey?: number }) {
  const [time, setTime] = useState(new Date());
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greetingText, setGreetingText] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Select a random Easter Egg on mount
    const selected = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
    setGreetingText(selected);

    const fetchBriefing = async () => {
      setIsLoading(true);
      try {
        const input = convertConfigToBriefingInput(config);
        const result = await generatePersonalizedBriefing(input);
        setBriefing(result);
      } catch (err) {
        setBriefing("Dashboard synchronized. Modules are up to date and ready.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBriefing();
  }, [config, refreshKey]);

  return (
    <div className="py-12 px-6 flex flex-col items-center text-center">
      <h1 className="text-8xl font-headline font-black tracking-tight mb-2 tabular-nums">
        {format(time, "HH:mm")}
      </h1>
      <p className="text-xl text-muted-foreground font-medium mb-8">
        {format(time, "EEEE, MMMM do, yyyy")}
      </p>
      
      <div className="max-w-3xl w-full p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 backdrop-blur-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        
        <h2 className="text-2xl font-headline font-bold mb-4 text-foreground/90">
          {greetingText}
        </h2>
        
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-primary/10 rounded-full w-full animate-skeleton" />
            <div className="h-4 bg-primary/10 rounded-full w-[90%] animate-skeleton" />
            <div className="h-4 bg-primary/10 rounded-full w-[80%] animate-skeleton" />
          </div>
        ) : (
          <p className="text-lg text-foreground/80 leading-relaxed font-body">
            {briefing || "Dashboard synchronized. Modules are up to date and ready."}
          </p>
        )}
      </div>
    </div>
  );
}
