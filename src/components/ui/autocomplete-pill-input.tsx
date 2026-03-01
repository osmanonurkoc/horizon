"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pill } from "@/components/ui/pill";

interface AutocompleteOption {
  label: string;
  value: any;
  logo?: string;
}

interface AutocompletePillInputProps {
  searchType: 'location' | 'stock' | 'sport' | 'static';
  staticOptions?: string[];
  apiKey?: string;
  values: any[];
  onChange: (values: any[]) => void;
  placeholder?: string;
  isMulti?: boolean;
}

export function AutocompletePillInput({
  searchType,
  staticOptions = [],
  apiKey,
  values,
  onChange,
  placeholder = "Search...",
  isMulti = true,
}: AutocompletePillInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const performSearch = React.useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      if (searchType !== 'static') {
        setOptions([]);
        return;
      }
    }

    if (searchType === 'static') {
      const filtered = staticOptions
        .filter(opt => opt.toLowerCase().includes(query.toLowerCase()))
        .map(opt => ({ label: opt, value: opt }));
      setOptions(filtered);
      return;
    }

    setLoading(true);
    try {
      if (searchType === 'location') {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`);
        const data = await res.json();
        if (data.results) {
          setOptions(data.results.map((r: any) => ({
            label: `${r.name}, ${r.country}`,
            value: `${r.name}, ${r.country}`
          })));
        }
      } else if (searchType === 'stock') {
        const url = `https://corsproxy.io/?${encodeURIComponent(`https://query2.finance.yahoo.com/v1/finance/search?q=${query}`)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.quotes) {
          setOptions(data.quotes.slice(0, 5).map((q: any) => ({
            label: `${q.symbol} - ${q.shortname || q.longname || ''}`,
            value: q.symbol
          })));
        }
      } else if (searchType === 'sport') {
        if (!apiKey) {
          setOptions([{ label: "Please enter API key first.", value: null }]);
          return;
        }
        const url = `https://corsproxy.io/?${encodeURIComponent(`https://v3.football.api-sports.io/teams?search=${query}`)}`;
        const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
        const data = await res.json();
        if (data.response) {
          setOptions(data.response.slice(0, 5).map((r: any) => ({
            label: r.team.name,
            value: { id: r.team.id, name: r.team.name, logo: r.team.logo },
            logo: r.team.logo
          })));
        }
      }
    } catch (e) {
      console.warn(`Autocomplete fetch error (${searchType}):`, e);
    } finally {
      setLoading(false);
    }
  }, [searchType, staticOptions, apiKey]);

  React.useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      performSearch(inputValue);
    }, 500);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [inputValue, performSearch]);

  const handleSelect = (option: AutocompleteOption) => {
    if (option.value === null) return;
    
    if (isMulti) {
      const exists = values.some(v => 
        typeof v === 'object' ? v.id === option.value.id : v === option.value
      );
      if (!exists) {
        onChange([...values, option.value]);
      }
    } else {
      onChange([option.value]);
      setOpen(false);
    }
    setInputValue("");
    setActiveIndex(-1);
  };

  const getLabel = (val: any) => {
    if (typeof val === 'object' && val !== null) return val.name;
    return val;
  };

  return (
    <div className="space-y-3 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <input
              type="text"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder={values.length > 0 && !isMulti ? getLabel(values[0]) : placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setOpen(true)}
            />
            <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-xl border-none z-[50]" 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[300px] overflow-y-auto" ref={scrollContainerRef}>
            {loading ? (
              <div className="py-6 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Searching...</span>
              </div>
            ) : options.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {inputValue.length < 2 ? "Type to search..." : "No results found."}
              </div>
            ) : (
              <div className="p-1">
                {options.map((option, index) => (
                  <div
                    key={`${option.label}-${index}`}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                      activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option);
                    }}
                  >
                    {option.logo && <img src={option.logo} alt="" className="w-4 h-4 mr-2" />}
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {values.map((val, idx) => (
          <Pill 
            key={`${getLabel(val)}-${idx}`} 
            label={getLabel(val)} 
            onRemove={() => onChange(values.filter((_, i) => i !== idx))} 
          />
        ))}
      </div>
    </div>
  );
}
