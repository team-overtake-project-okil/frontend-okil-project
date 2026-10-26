import { useEffect, useId, useRef, useState } from "react";
import SearchIcon from "../icons/search";
import ClearInput from "../icons/clear-input";
import { searchAddresses, type AddressSuggestion } from "../services/geocoding";

interface AddressSearchProps {
  onLocationChange: (location: AddressSuggestion | null) => void;
  selectedAddress?: AddressSuggestion | null;
  variant?: "map" | "hero";
  formId?: string;
  onEmptySubmit?: () => void;
}

export function AddressSearch({ onLocationChange, selectedAddress, variant = "map", formId, onEmptySubmit }: AddressSearchProps) {
  const inputId = useId();
  const [value, setValue] = useState(selectedAddress?.address ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);

  // Cancel pending work when clearing, selecting, or leaving the component.
  const cancelSearch = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    controller.current?.abort();
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
  }, []);

  // Keep the hero and map searches aligned after selecting an address.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    setValue(selectedAddress?.address ?? "");
    setSuggestions([]);
    setError(null);
    setIsLoading(false);
    setIsOpen(false);
  }, [selectedAddress]);

  const selectSuggestion = (item: AddressSuggestion) => {
    cancelSearch();
    setValue(item.address);
    setSuggestions([]);
    setError(null);
    setIsLoading(false);
    setIsOpen(false);
    // The map owns H3 conversion; address search only supplies coordinates.
    onLocationChange(item);
  };

  const runSearch = async (query: string, selectFirst = false) => {
    cancelSearch();
    const active = new AbortController();
    controller.current = active;
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setIsOpen(true);
    try {
      const results = await searchAddresses(query, active.signal);
      if (active.signal.aborted) return;
      if (selectFirst && results.length) selectSuggestion(results[0]);
      else setSuggestions(results);
    } catch (cause) {
      if (!active.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Не вдалося знайти адресу.");
      }
    } finally {
      if (!active.signal.aborted) setIsLoading(false);
    }
  };

  const changeValue = (next: string) => {
    cancelSearch();
    setValue(next);
    setSuggestions([]);
    setError(null);
    const canSearch = next.trim().length >= 2;
    setIsOpen(canSearch);
    setIsLoading(canSearch);
    if (canSearch) timer.current = setTimeout(() => void runSearch(next), 350);
  };

  const clear = () => {
    changeValue("");
    onLocationChange(null);
  };

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) {
          onEmptySubmit?.();
          return;
        }
        void runSearch(value, true);
      }}
      data-search-small className={variant === "hero"
      ? "flex min-h-25 w-full max-w-92.5 min-w-0 flex-col items-start gap-3 rounded-[22px] bg-white p-4 shadow-sm"
      : "flex flex-col gap-2 pb-3"}>
      <label htmlFor={inputId} className="text-[13px] text-[#8E8E93]">
        {variant === "hero" ? "Знайти за адресою" : "Пошук за адресою"}
      </label>
      <div className={variant === "hero" ? "relative w-full" : "relative w-80"}>
        <div className="flex w-full items-center gap-2 rounded-xl bg-[#767680]/12 px-3 py-2">
          <SearchIcon className="size-4 text-zinc-500" />
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            placeholder="Наприклад: вул. Залізнична 7П"
            className="w-full bg-transparent text-sm text-black outline-none placeholder:text-[#8E8E93]"
            value={value}
            onChange={(event) => changeValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.nativeEvent.isComposing) {
                event.preventDefault();
              }
              if (event.key === "Escape") {
                cancelSearch();
                setIsLoading(false);
                setIsOpen(false);
              }
            }}
          />
          {value && (
            <button type="button" onClick={clear} aria-label="Очистити" className="shrink-0 text-[#8E8E93] transition-opacity hover:opacity-70">
              <ClearInput className="size-4" />
            </button>
          )}
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
            {isLoading ? (
              <p role="status" className="px-4 py-2.5 text-sm text-zinc-500">Пошук адрес…</p>
            ) : error ? (
              <p role="alert" className="px-4 py-2.5 text-sm text-red-600">{error}</p>
            ) : suggestions.length === 0 ? (
              <p role="status" className="px-4 py-2.5 text-sm text-zinc-500">Адресу не знайдено. Уточніть назву вулиці або номер будинку.</p>
            ) : (
              <ul>
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => selectSuggestion(item)} className="w-full cursor-pointer border-b border-gray-50 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 hover:text-blue-600 focus-visible:bg-gray-50">
                      {item.address}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
