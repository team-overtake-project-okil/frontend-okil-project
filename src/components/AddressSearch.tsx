import { useEffect, useId, useRef, useState } from "react";
import SearchIcon from "../icons/search";
import ClearInput from "../icons/clear-input";
import { searchAddresses, geocodeAddressSuggestion, type AddressSuggestion } from "../services/geocoding";
import { getAddressParts } from "../services/addressValidation";

interface AddressSearchProps {
  onLocationChange: (location: AddressSuggestion | null) => void;
  selectedAddress?: AddressSuggestion | null;
  variant?: "map" | "hero";
  formId?: string;
  onEmptySubmit?: () => void;
}

export function AddressSearch({ onLocationChange, selectedAddress, variant = "map", formId, onEmptySubmit }: AddressSearchProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(selectedAddress?.address ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [addressInvalid, setAddressInvalid] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const preserveDraft = useRef(false);
  const pendingQuery = useRef<string | null>(null);
  const focused = useRef(false);
  const cache = useRef<{ query: string; results: AddressSuggestion[] } | null>(null);
  const hasHouse = Boolean(getAddressParts(value).houseNumber);
  const isInvalid = Boolean(validation) || addressInvalid;

  const cancelSearch = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingQuery.current = null;
    controller.current?.abort();
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
  }, []);

  useEffect(() => {
    // Editing clears shared coordinates without erasing this field's draft.
    if (!selectedAddress && preserveDraft.current) {
      preserveDraft.current = false;
      return;
    }
    preserveDraft.current = false;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    setValue(selectedAddress?.address ?? "");
    setSuggestions([]);
    setError(null);
    setValidation(null);
    setAddressInvalid(false);
    setActiveIndex(-1);
    setIsLoading(false);
    setIsOpen(false);
  }, [selectedAddress]);

  const runSearch = async (query: string) => {
    if (pendingQuery.current === query.trim() && !controller.current?.signal.aborted) return;
    cancelSearch();
    setError(null);
    setAddressInvalid(false);
    setActiveIndex(-1);
    setIsOpen(focused.current);
    if (cache.current?.query === query.trim()) {
      setSuggestions(cache.current.results);
      setAddressInvalid(cache.current.results.length === 0);
      setIsLoading(false);
      return;
    }
    const active = new AbortController();
    controller.current = active;
    pendingQuery.current = query.trim();
    setIsLoading(true);
    setSuggestions([]);
    try {
      const results = await searchAddresses(query, active.signal, (items) => {
        if (active.signal.aborted) return;
        setSuggestions(items);
        setAddressInvalid(false);
        setIsLoading(false);
      });
      if (active.signal.aborted) return;
      cache.current = { query: query.trim(), results };
      setActiveIndex(-1);
      setSuggestions(results);
      setAddressInvalid(results.length === 0);
    } catch {
      if (!active.signal.aborted) setError("Не вдалося виконати пошук. Спробуйте ще раз.");
    } finally {
      if (controller.current === active) pendingQuery.current = null;
      if (!active.signal.aborted) setIsLoading(false);
    }
  };

  const changeValue = (next: string, scheduleSearch = true) => {
    cancelSearch();
    setValue(next);
    setSuggestions([]);
    setError(null);
    setValidation(null);
    setAddressInvalid(false);
    setActiveIndex(-1);
    if (selectedAddress) {
      preserveDraft.current = true;
      onLocationChange(null);
    }
    const canSearch = scheduleSearch && next.trim().length >= 3;
    setIsOpen(canSearch);
    setIsLoading(canSearch);
    if (canSearch) timer.current = setTimeout(() => void runSearch(next), 700);
  };

  const selectSuggestion = async (item: AddressSuggestion) => {
    if (!item.houseNumber || !item.isComplete) {
      // The selected street is already known; wait for user input before searching again.
      changeValue(`${item.street}, `, false);
      inputRef.current?.focus();
      setIsOpen(false);
      return;
    }
    cancelSearch();
    const active = new AbortController();
    controller.current = active;
    setValue(item.address);
    setError(null);
    setValidation(null);
    setAddressInvalid(false);
    setActiveIndex(-1);
    setIsLoading(true);
    setIsOpen(focused.current);
    try {
      const location = await geocodeAddressSuggestion(item, active.signal);
      if (active.signal.aborted) return;
      if (!location) return;
      setValue(location.address);
      setSuggestions([]);
      setIsOpen(false);
      onLocationChange(location);
    } catch {
      if (!active.signal.aborted) {
        setError("Не вдалося перевірити адресу. Спробуйте ще раз.");
        setIsOpen(true);
      }
    } finally {
      if (!active.signal.aborted) setIsLoading(false);
    }
  };

  const attribution = (
    <div className="flex self-end gap-2 text-[10px] text-zinc-500">
        <a href="https://api.visicom.ua/" target="_blank" rel="noopener noreferrer" className="hover:underline">© Visicom</a>
        <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Geoapify</a>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">© OpenStreetMap</a>
      </div>
  );

  return (
    <form id={formId} onSubmit={(event) => {
      event.preventDefault();
      if (!value.trim() && onEmptySubmit) {
        onEmptySubmit();
        return;
      }
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        void selectSuggestion(suggestions[activeIndex]);
        return;
      }
      inputRef.current?.focus();
      if (!hasHouse) {
        setValidation("Додайте номер будинку, щоб знайти точну адресу");
        inputRef.current?.focus();
        return;
      }
      // Enter opens suggestions; only an explicit choice confirms coordinates.
      if (!isLoading) void runSearch(value);
    }} data-search-small className={variant === "hero"
      ? "flex min-h-25 w-full max-w-92.5 min-w-0 flex-col items-start gap-3 rounded-[22px] bg-white p-4 shadow-sm"
      : "flex flex-col gap-2 pb-3"}>
      <label htmlFor={inputId} className="text-[13px] text-[#8E8E93]">Повна назва вулиці та номер будинку</label>
      <div className={variant === "hero" ? "relative w-full" : "relative w-full max-w-100"}>
        <div className={`flex w-full items-center gap-2 rounded-xl bg-[#767680]/12 px-3 py-2 ${isLoading || value.trim().length <= 2 ? "focus-within:ring-2 focus-within:ring-zinc-400" : isInvalid ? "ring-2 ring-red-600" : "focus-within:ring-2 focus-within:ring-blue-500"}`}>
          <SearchIcon className="size-4 shrink-0 text-zinc-500" />
          <input ref={inputRef} id={inputId} type="text" autoComplete="off"
            role="combobox" aria-autocomplete="list" aria-expanded={isOpen}
            aria-controls={isOpen ? `${inputId}-list` : undefined}
            aria-activedescendant={isOpen && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
            aria-describedby={validation ? `${inputId}-error` : undefined} aria-invalid={isInvalid}
            placeholder="Залізнична, 7П"
            className="w-full min-w-0 bg-transparent text-sm text-black outline-none placeholder:text-[#8E8E93]"
            value={value} onChange={(event) => changeValue(event.target.value)}
            onBlur={() => { focused.current = false; setIsOpen(false); }}
            onFocus={() => { focused.current = true; if (suggestions.length || error || isLoading) setIsOpen(true); }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) {
                if (event.key === "Enter") event.preventDefault();
                return;
              }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setIsOpen(true);
                if (suggestions.length) setActiveIndex((index) => event.key === "ArrowDown"
                  ? (index + 1) % suggestions.length
                  : (index <= 0 ? suggestions.length - 1 : index - 1));
              }
              if (event.key === "Escape") {
                cancelSearch();
                setIsLoading(false);
                setIsOpen(false);
                setActiveIndex(-1);
              }
            }} />
          {value && <button type="button" onClick={() => {
            changeValue("");
            if (!selectedAddress) onLocationChange(null);
            inputRef.current?.focus();
          }} aria-label="Очистити адресу" className="shrink-0 text-[#8E8E93] transition-opacity hover:opacity-70"><ClearInput className="size-4" /></button>}
        </div>
        {isOpen && <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <ul id={`${inputId}-list`} role="listbox" aria-label="Знайдені адреси">
            {!isLoading && !error && suggestions.map((item, index) => (
              <li key={item.id} id={`${inputId}-option-${index}`} role="option" aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()} onClick={() => void selectSuggestion(item)}
                className={`cursor-pointer border-b border-gray-50 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${activeIndex === index ? "bg-blue-50 text-blue-700" : "text-black"}`}>
                {item.address}
                {!item.isComplete && <span className="mt-1 block text-xs text-zinc-500">Додайте номер будинку</span>}
              </li>
            ))}
          </ul>
          {isLoading ? <p role="status" className="px-4 py-2.5 text-sm text-zinc-500">Пошук адрес…</p>
            : error ? <p role="alert" className="px-4 py-2.5 text-sm text-red-600">{error}</p>
            : suggestions.length === 0 && <p role="status" className="px-4 py-2.5 text-sm text-zinc-500">{hasHouse
              ? "Адресу не знайдено. Уточніть назву вулиці та номер."
              : "Введіть повну назву вулиці та номер будинку"}</p>}
          {variant === "hero" && !isLoading && !error && suggestions.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2">{attribution}</div>
          )}
        </div>}
      </div>
      {validation && <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">{validation}</p>}
    </form>
  );
}
