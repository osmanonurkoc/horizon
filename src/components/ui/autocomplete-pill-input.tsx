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

interface AutocompletePillInputProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  onSearch?: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  isMulti?: boolean;
}

export function AutocompletePillInput({
  options,
  values,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = "Select items...",
  isMulti = true,
}: AutocompletePillInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const uniqueOptions = React.useMemo(() => Array.from(new Set(options)), [options]);

  const handleSelect = React.useCallback((val: string) => {
    if (isMulti) {
      if (!values.includes(val)) {
        onChange([...values, val]);
      }
    } else {
      onChange([val]);
      setOpen(false);
    }
    setInputValue("");
    setActiveIndex(-1);
  }, [values, isMulti, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") setOpen(true);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < uniqueOptions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < uniqueOptions.length) {
          handleSelect(uniqueOptions[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  React.useEffect(() => {
    if (activeIndex !== -1 && scrollContainerRef.current) {
      const activeItem = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  return (
    <div className="space-y-3 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <input
              type="text"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={values.length > 0 && !isMulti ? values[0] : placeholder}
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setInputValue(val);
                onSearch?.(val);
                if (!open) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setOpen(true)}
            />
            <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-xl border-none" 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[300px] overflow-y-auto" ref={scrollContainerRef}>
            {isLoading ? (
              <div className="py-6 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Searching...</span>
              </div>
            ) : uniqueOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {inputValue.length < 2 ? "Type to search..." : "No results found."}
              </div>
            ) : (
              <div className="p-1">
                {uniqueOptions.map((option, index) => (
                  <div
                    key={`${option}-${index}`}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                      activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                      values.includes(option) && "text-primary font-bold"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        values.includes(option) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {isMulti && values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((val, idx) => (
            <Pill key={`${val}-${idx}`} label={val} onRemove={() => onChange(values.filter(v => v !== val))} />
          ))}
        </div>
      )}
      
      {!isMulti && values.length > 0 && inputValue === "" && (
        <div className="flex">
          <Pill label={values[0]} onRemove={() => onChange([])} />
        </div>
      )}
    </div>
  );
}