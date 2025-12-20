import { useEffect, useState } from 'react';

/**
 * Debounce hook that delays updating the returned value until after
 * the specified delay has elapsed since the last time the value changed.
 * 
 * This is useful for reducing the frequency of expensive operations like
 * API calls when the user is actively typing.
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * // Query only runs 300ms after user stops typing
 * const results = useQuery(api.search, { query: debouncedSearchTerm });
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timer if value changes (cleanup function)
    // This prevents the debounced value from updating if the value changes again
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
