"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pill } from "@/components/ui/pill";
import { 
  Command as CommandPrimitive,
  CommandInput as CommandPrimitiveInput,
  CommandList as CommandPrimitiveList,
  CommandEmpty as CommandPrimitiveEmpty,
  CommandGroup as CommandPrimitiveGroup,
  CommandItem as CommandPrimitiveItem
} from "cmdk"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = "Command"

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitiveInput>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitiveInput>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <CommandPrimitiveInput
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = "CommandInput"

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitiveList>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitiveList>
>(({ className, ...props }, ref) => (
  <CommandPrimitiveList
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandList.displayName = "CommandList"

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitiveEmpty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitiveEmpty>
>((props, ref) => (
  <CommandPrimitiveEmpty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))
CommandEmpty.displayName = "CommandEmpty"

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitiveGroup>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitiveGroup>
>(({ className, ...props }, ref) => (
  <CommandPrimitiveGroup
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = "CommandGroup"

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitiveItem>
>(({ className, ...props }, ref) => (
  <CommandPrimitiveItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = "CommandItem"

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

  const uniqueOptions = React.useMemo(() => Array.from(new Set(options)), [options]);

  const handleSelect = (val: string) => {
    if (isMulti) {
      if (values.includes(val)) {
        onChange(values.filter((item) => item !== val));
      } else {
        onChange([...values, val]);
      }
    } else {
      onChange([val]);
      setOpen(false);
    }
    setInputValue("");
  };

  const removeValue = (val: string) => {
    onChange(values.filter((item) => item !== val));
  };

  return (
    <div className="space-y-3 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 rounded-xl bg-background border-input"
          >
            <span className="truncate text-muted-foreground font-normal">
              {values.length > 0 && !isMulti 
                ? values[0] 
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden shadow-xl border-none" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Command shouldFilter={!onSearch}>
            <CommandInput 
              placeholder={`Search ${placeholder.toLowerCase()}...`} 
              value={inputValue}
              onValueChange={(val) => {
                setInputValue(val);
                onSearch?.(val);
              }}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {uniqueOptions.map((option) => (
                      <CommandItem
                        key={option}
                        value={option}
                        onMouseDown={(e) => {
                          // Crucial: Prevent focus loss so mouse click registers correctly
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onSelect={() => handleSelect(option)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            values.includes(option) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isMulti && values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((val) => (
            <Pill key={val} label={val} onRemove={() => removeValue(val)} />
          ))}
        </div>
      )}
      
      {!isMulti && values.length > 0 && (
        <div className="flex">
          <Pill label={values[0]} onRemove={() => onChange([])} />
        </div>
      )}
    </div>
  );
}