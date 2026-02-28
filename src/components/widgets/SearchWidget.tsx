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
    window.location.href = `${config.searchEngine}${encodeURIComponent(query)}`;
  };

  return (
    <Card className="rounded-3xl-card bg-primary shadow-lg border-none overflow-hidden group">
      <CardContent className="p-6">
        <form onSubmit={handleSearch} className="relative">
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the horizon..."
            className="h-16 pl-14 pr-6 rounded-2xl bg-white/20 border-none text-white placeholder:text-white/60 text-lg focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-white/50 transition-all"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/80" />
          <button type="submit" className="hidden">Search</button>
        </form>
      </CardContent>
    </Card>
  );
}