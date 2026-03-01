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

const EMPTY_STATIC_OPTIONS: string[] = [];

export function AutocompletePillInput({
  searchType,
  staticOptions = EMPTY_STATIC_OPTIONS,
  apiKey,
  values,
  onChange,
  placeholder = "Search...",
  isMulti = true,
}: AutocompletePillInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.setState("");
  const [options, setOptions] = React.useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!inputValue || inputValue.trim().length < 2) {
      if (searchType !== 'static') {
        if (options.length > 0) setOptions([]);
        return;
      }
    }

    if (searchType === 'static') {
      const filtered = staticOptions
        .filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()))
        .map(opt => ({ label: opt, value: opt }));
      
      setOptions(prev => {
        const isSame = prev.length === filtered.length && 
                      prev.every((v, i) => v.value === filtered[i].value);
        return isSame ? prev : filtered;
      });
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (searchType === 'location') {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputValue)}&count=5`);
          const data = await res.json();
          if (data.results) {
            setOptions(data.results.map((r: any) => ({
              label: `${r.name}, ${r.country}`,
              value: `${r.name}, ${r.country}`
            })));
          }
        } else if (searchType === 'stock') {
          const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query2.finance.yahoo.com/v1/finance/search?q=${inputValue}`)}`;
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
            setLoading(false);
            return;
          }
          const url = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(inputValue)}`;
          const res = await fetch(url, {
            headers: { 
              "x-apisports-key": apiKey,
              "Accept": "application/json"
            }
          });
          const data = await res.json();
          
          if (data.errors && Object.keys(data.errors).length > 0) {
            const msg = Object.values(data.errors)[0] as string;
            setOptions([{ label: `API Error: ${msg}`, value: null }]);
            setLoading(false);
            return;
          }
          
          if (data.response) {
            setOptions(data.response.slice(0, 5).map((r: any) => ({
              label: r.team.name,
              value: { id: r.team.id, name: r.team.name, logo: r.team.logo },
              logo: r.team.logo
            })));
          }
        }
      } catch (e) {
        console.warn(`Autocomplete search error:`, e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [inputValue, searchType, apiKey, staticOptions, options.length]);

  const areValuesEqual = (a: any, b: any) => {
    const isAObj = a !== null && typeof a === 'object';
    const isBObj = b !== null && typeof b === 'object';
    if (isAObj && isBObj) {
      return a.id === b.id;
    }
    return a === b;
  };

  const handleSelect = (option: AutocompleteOption) => {
    if (option.value === null) return;
    
    if (isMulti) {
      const exists = values.some(v => areValuesEqual(v, option.value));
      if (!exists) {
        onChange([...values, option.value]);
      }
    } else {
      onChange([option.value]);
      setOpen(false);
    }
    setInputValue("");
  };

  const getLabel = (val: any) => {
    if (val !== null && typeof val === 'object') return val.name;
    return val;
  };

  const isSelected = (optionValue: any) => {
    return values.some(v => areValuesEqual(v, optionValue));
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
          <div className="max-h-[300px] overflow-y-auto">
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
                {options.map((option, index) => {
                  const selected = isSelected(option.value);
                  return (
                    <div
                      key={`${option.label}-${index}`}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-accent/50"
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(option);
                      }}
                    >
                      {option.logo && <img src={option.logo} alt="" className="w-4 h-4 mr-2" />}
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check className="w-4 h-4 ml-auto text-primary" />}
                    </div>
                  );
                })}
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
