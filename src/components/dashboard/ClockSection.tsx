"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { type DiscoverConfig, convertConfigToBriefingInput } from "@/lib/config-store";
import { generatePersonalizedBriefing } from "@/ai/flows/personalized-briefing";
import { Sparkles } from "lucide-react";

const EASTER_EGGS = [
  "Take a deep breath and enjoy the moment.",
  "Here is to making today a great one.",
  "Stay hydrated and remember to take a quick break.",
  "A beautiful day begins with a positive mindset.",
  "Small steps every day lead to big journeys.",
  "Hope you find something that makes you smile today.",
  "Let's see what the world has in store for you.",
  "Everything you need, right at your fingertips.",
  "Stay curious, stay inspired.",
  "Wishing you focus and clarity for the hours ahead.",
  "Remember to celebrate the little wins today.",
  "Your daily digest, served fresh.",
  "Take things one step at a time.",
  "Welcome to your personal horizon.",
  "Wishing you a peaceful and productive day."
];

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
};

export function ClockSection({ config, refreshKey = 0 }: { config: DiscoverConfig, refreshKey?: number }) {
  const [time, setTime] = useState(new Date());
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeGreeting, setTimeGreeting] = useState("");
  const [randomMessage, setRandomMessage] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Select greeting and message on mount to avoid hydration mismatch
    const greeting = getTimeGreeting();
    const message = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
    
    setTimeGreeting(greeting);
    setRandomMessage(message);

    const fetchBriefing = async () => {
      setIsLoading(true);
      try {
        const input = convertConfigToBriefingInput(config);
        const result = await generatePersonalizedBriefing(input);
        setBriefing(result);
      } catch (err) {
        setBriefing("Dashboard synchronized. Your personalized modules are up to date.");
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
      
      <div className="max-w-3xl w-full p-10 bg-primary/5 rounded-[3rem] border border-primary/20 backdrop-blur-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles className="w-16 h-16 text-primary" />
        </div>
        
        <h2 className="text-3xl font-headline font-bold mb-4 text-foreground/90">
          {timeGreeting ? `${timeGreeting}.` : "Welcome back."}
        </h2>
        
        {isLoading ? (
          <div className="space-y-3 flex flex-col items-center">
            <div className="h-4 bg-primary/10 rounded-full w-3/4 animate-skeleton" />
            <div className="h-4 bg-primary/10 rounded-full w-1/2 animate-skeleton" />
          </div>
        ) : (
          <p className="text-lg text-foreground/70 leading-relaxed font-body italic max-w-2xl mx-auto">
            {randomMessage} {briefing || "Dashboard synchronized. Your personalized modules are up to date."}
          </p>
        )}
      </div>
    </div>
  );
}