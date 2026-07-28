import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "./utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export interface ComboboxOption {
  value: string;
  label: string;
  days?: number;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  onOptionSelect?: (value: string) => void;
  onCreateOption?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function Combobox({
  options,
  value,
  onValueChange,
  onOptionSelect,
  onCreateOption,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  onKeyDown,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const hasExactMatch = filteredOptions.some(
    (option) => option.label.toLowerCase() === searchValue.toLowerCase()
  );

  const showCreateNew = onCreateOption && searchValue && !hasExactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-['Roboto_Mono'] text-[12px]",
            !value && "text-muted-foreground",
            className
          )}
          onKeyDown={onKeyDown}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={(val) => {
              setSearchValue(val);
              onValueChange(val);
            }}
            className="font-['Roboto_Mono'] text-[12px]"
          />
          <CommandEmpty className="py-6 text-center font-['Roboto_Mono'] text-[11px]">
            {emptyText}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {showCreateNew && (
              <CommandItem
                value={`__create__${searchValue}`}
                onSelect={() => {
                  onCreateOption!(searchValue);
                  setSearchValue("");
                  setOpen(false);
                }}
                className="font-['Roboto_Mono'] text-[12px] text-accent cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create "{searchValue}"
              </CommandItem>
            )}
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  onValueChange(option.label);
                  if (onOptionSelect) {
                    // Pass the actual option.value, not currentValue (which is lowercase transformed)
                    onOptionSelect(option.value);
                  }
                  setOpen(false);
                  setSearchValue("");
                }}
                className="font-['Roboto_Mono'] text-[12px] cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.label ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex-1">{option.label}</span>
                {option.days !== undefined && (
                  <span className="text-muted-foreground text-[10px] ml-2">
                    {option.days}d
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}