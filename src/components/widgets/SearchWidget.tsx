"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { type DiscoverConfig } from "@/lib/config-store";

export function SearchWidget({ config }: { config: DiscoverConfig }) {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    window.open(`${config.searchEngine}${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <Card className="rounded-3xl-card bg-primary shadow-lg border-none overflow-hidden group transition-all hover:scale-[1.01]">
      <CardContent className="p-6">
        <form onSubmit={handleSearch} className="relative">
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Explore the horizon..."
            className="h-16 pl-14 pr-6 rounded-2xl bg-primary-foreground/10 border-none text-primary-foreground placeholder:text-primary-foreground/60 text-lg focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-primary-foreground/50 transition-all"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-primary-foreground/80" />
          <button type="submit" className="hidden">Search</button>
        </form>
      </CardContent>
    </Card>
  );
}
