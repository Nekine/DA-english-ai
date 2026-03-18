import React, { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder: string;
  suggestions: string[];
  onSearch: (term: string) => void;
  iconColor?: string;
  className?: string;
  // Added these new props for controlled input
  value?: string;
  onChange?: (value: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder,
  suggestions = [],
  onSearch,
  className,
  iconColor = "text-muted-foreground",
  value: controlledValue,
  onChange
}) => {
  const isControlled = controlledValue !== undefined && onChange !== undefined;
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Use either the controlled value or the internal state
  const value = isControlled ? controlledValue : internalValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (isControlled) {
      // If controlled, call the onChange prop
      onChange?.(newValue);
    } else {
      // Otherwise update internal state
      setInternalValue(newValue);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Update the input field first
    if (isControlled) {
      onChange?.(suggestion);
    } else {
      setInternalValue(suggestion);
    }

    // Then trigger the search
    onSearch(suggestion);

    // Close suggestions panel
    setIsFocused(false);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="relative">
        <motion.div
          animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="w-full"
        >
          <div className="relative">
            <Search
              className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5", iconColor)}
            />
            <input
              type="text"
              value={value}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={(e) => {
                // Delayed blur to allow clicking suggestions
                setTimeout(() => setIsFocused(false), 200);
              }}
              placeholder={placeholder}
              className={cn(
                "search-input w-full pl-10 pr-4 py-3 rounded-xl border border-border/70 bg-background/80 placeholder:text-muted-foreground/70 focus:outline-none",
                className
              )}
            />
            {value && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/90"
              >
                Tìm kiếm
              </button>
            )}
          </div>
        </motion.div>
      </form>

      {suggestions.length > 0 && isFocused && (
        <div className="mt-2 p-2 bg-card rounded-lg border border-border/50 shadow-lg z-50">
          <p className="px-2 py-1 text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Star className="w-3 h-3" /> Gợi ý tra cứu
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onMouseDown={(e) => {
                  // Using mouseDown instead of click to prevent blur from firing first
                  e.preventDefault();
                  handleSuggestionClick(suggestion);
                }}
                className="px-3 py-1.5 text-sm bg-muted rounded-md hover:bg-muted/80 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchInput;