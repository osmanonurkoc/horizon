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
  staticOptions?: any[];
  apiKey?: string;
  values: any[];
  onChange: (values: any[]) => void;
  placeholder?: string;
  isMulti?: boolean;
}

const EMPTY_STATIC_OPTIONS: any[] = [];

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
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const checkEquality = (v1: any, v2: any) => {
    if (!v1 || !v2) return false;
    
    // If both are objects
    if (typeof v1 === 'object' && typeof v2 === 'object') {
      if (v1.id && v2.id) return String(v1.id) === String(v2.id);
      if (v1.value && v2.value) return String(v1.value).toLowerCase() === String(v2.value).toLowerCase();
      return JSON.stringify(v1) === JSON.stringify(v2);
    }
    
    // If one is object and the other is a primitive (string/number)
    if (typeof v1 === 'object') {
      const matchStr = String(v2).toLowerCase();
      return (v1.id && String(v1.id).toLowerCase() === matchStr) || 
             (v1.value && String(v1.value).toLowerCase() === matchStr) || 
             (v1.name && String(v1.name).toLowerCase() === matchStr);
    }
    if (typeof v2 === 'object') {
      const matchStr = String(v1).toLowerCase();
      return (v2.id && String(v2.id).toLowerCase() === matchStr) || 
             (v2.value && String(v2.value).toLowerCase() === matchStr) || 
             (v2.name && String(v2.name).toLowerCase() === matchStr);
    }
    
    // If both are primitives (e.g., 'Technology' vs 'technology')
    return String(v1).toLowerCase() === String(v2).toLowerCase();
  };

  const getLabel = (val: any) => {
    if (!val) return "";
    
    // Check static options first for a matching label
    const staticOpt = staticOptions.find(o => checkEquality(o.value, val));
    if (staticOpt) return staticOpt.label;

    if (typeof val === 'object') {
      if ('label' in val) return val.label;
      if ('name' in val) return val.name;
      if ('value' in val) return val.value;
      return val.id || JSON.stringify(val);
    }
    
    return val;
  };

  const displayOptions = React.useMemo(() => {
    if (searchType === 'static') {
      const query = (inputValue || '').toLowerCase().trim();
      return staticOptions
        .filter(opt => {
          if (!query) return true; // Show all if input is empty
          const text = typeof opt === 'object' ? String(opt.label || opt.value || '') : String(opt);
          return text.toLowerCase().includes(query);
        })
        .map(opt => {
          if (typeof opt === 'object') return { label: opt.label || opt.value, value: opt.value, logo: opt.logo };
          return { label: String(opt), value: opt };
        });
    }
    return options; // Fallback to standard state for async fetches
  }, [searchType, staticOptions, inputValue, options]);

  React.useEffect(() => {
    // STATIC TYPES DO NOT USE EFFECTS OR TIMEOUTS
    if (searchType === 'static') return;

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!inputValue || inputValue.trim().length < 2) {
      if (options.length > 0) setOptions([]);
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
          const res = await fetch(`/api/sports?endpoint=search&query=${encodeURIComponent(inputValue)}`, {
            headers: { "x-sports-key": apiKey || '3' }
          });
          const data = await res.json();
          
          if (data.teams) {
            setOptions(data.teams.map((t: any) => ({
              label: t.strTeam,
              value: { id: t.idTeam, name: t.strTeam, logo: t.strTeamBadge },
              logo: t.strTeamBadge
            })));
          } else {
            setOptions([]);
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
  }, [inputValue, searchType, apiKey]);

  const isSelected = (optionValue: any) => {
    return values.some(v => checkEquality(v, optionValue));
  };

  const handleSelect = (option: AutocompleteOption) => {
    if (option.value === null) return;
    
    if (isMulti) {
      const exists = values.some(v => checkEquality(v, option.value));
      if (!exists) {
        onChange([...values, option.value]);
      }
    } else {
      onChange([option.value]);
      setOpen(false);
    }
    setInputValue("");
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
            {loading && searchType !== 'static' ? (
              <div className="py-6 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Searching...</span>
              </div>
            ) : displayOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchType !== 'static' && inputValue.length < 2 ? "Type to search..." : "No results found."}
              </div>
            ) : (
              <div className="p-1">
                {displayOptions.map((option, index) => {
                  const selected = isSelected(option.value);
                  return (
                    <div
                      key={`${option.label}-${index}`}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-accent/50 text-primary font-bold"
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(option);
                      }}
                    >
                      {option.logo && <img src={option.logo} alt="" className="w-4 h-4 mr-2" />}
                      <span className="flex-1 truncate">{option.label}</span>
                      {selected && <Check className="w-4 h-4 ml-2 shrink-0" />}
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