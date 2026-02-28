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
    <Card className="rounded-3xl-card bg-card shadow-sm border border-border/50 overflow-hidden group transition-all hover:shadow-md hover:border-primary/30">
      <CardContent className="p-4">
        <form onSubmit={handleSearch} className="relative">
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Explore the horizon..."
            className="h-14 pl-12 pr-6 rounded-2xl bg-muted/30 border-none text-foreground placeholder:text-muted-foreground text-lg focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <button type="submit" className="hidden">Search</button>
        </form>
      </CardContent>
    </Card>
  );
}
