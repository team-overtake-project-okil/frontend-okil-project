import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  geocodeAddressSuggestion,
  searchAddresses,
  type AddressSuggestion,
} from "../../services/geocoding";
import { getAddressParts } from "../../services/addressValidation";

interface UseAddressSearchOptions {
  onLocationChange: (location: AddressSuggestion | null) => void;
  selectedAddress?: AddressSuggestion | null;
}

export function useAddressSearch({
  onLocationChange,
  selectedAddress,
}: UseAddressSearchOptions) {
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
  const cache = useRef<{ query: string; results: AddressSuggestion[] } | null>(
    null,
  );
  const hasHouse = Boolean(getAddressParts(value).houseNumber);
  const isInvalid = Boolean(validation) || addressInvalid;

  const cancelSearch = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingQuery.current = null;
    controller.current?.abort();
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      controller.current?.abort();
    },
    [],
  );

  useEffect(() => {
    // Editing clears shared coordinates without erasing this field's draft.
    if (!selectedAddress && preserveDraft.current) {
      preserveDraft.current = false;
      return;
    }
    preserveDraft.current = false;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    // Synchronize the other search field after an explicit map/address selection.
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
    if (
      pendingQuery.current === query.trim() &&
      !controller.current?.signal.aborted
    )
      return;
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
      if (!active.signal.aborted)
        setError("Не вдалося виконати пошук. Спробуйте ще раз.");
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

  const submit = (event: FormEvent, onEmptySubmit?: () => void) => {
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
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      if (suggestions.length)
        setActiveIndex((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % suggestions.length
            : index <= 0
              ? suggestions.length - 1
              : index - 1,
        );
    }
    if (event.key === "Escape") {
      cancelSearch();
      setIsLoading(false);
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const clear = () => {
    inputRef.current?.focus();
    changeValue("");
    if (!selectedAddress) onLocationChange(null);
  };

  return {
    inputRef,
    value,
    suggestions,
    isOpen,
    isLoading,
    error,
    validation,
    activeIndex,
    hasHouse,
    isInvalid,
    changeValue,
    selectSuggestion,
    submit,
    onKeyDown,
    onFocus: () => {
      focused.current = true;
      if (suggestions.length || error || isLoading) setIsOpen(true);
    },
    onBlur: () => {
      focused.current = false;
      setIsOpen(false);
    },
    clear,
  };
}
