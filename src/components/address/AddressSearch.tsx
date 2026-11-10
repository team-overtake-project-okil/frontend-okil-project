import { addressHintStart, useAddressHint } from "../../lib/useAddressHint";
import { useId } from "react";
import ArrowRight from "../../icons/arrow-right";
import SearchIcon from "../../icons/search";
import ClearInput from "../../icons/clear-input";
import type { AddressSuggestion } from "../../services/geocoding";
import { useAddressSearch } from "./useAddressSearch";

interface AddressSearchProps {
  onLocationChange: (location: AddressSuggestion | null) => void;
  selectedAddress?: AddressSuggestion | null;
  variant?: "map" | "hero";
  formId?: string;
  onEmptySubmit?: () => void;
}

export function AddressSearch({
  onLocationChange,
  selectedAddress,
  variant = "map",
  formId,
  onEmptySubmit,
}: AddressSearchProps) {
  const inputId = useId();
  const {
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
    onFocus,
    onBlur,
    clear,
  } = useAddressSearch({ onLocationChange, selectedAddress });

  useAddressHint(inputRef, variant === "hero" && !value);

  const attribution = (
    <div className="flex gap-2 self-end text-[10px] text-zinc-500">
      <a
        href="https://api.visicom.ua/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        © Visicom
      </a>
      <a
        href="https://www.geoapify.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Geoapify
      </a>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        © OpenStreetMap
      </a>
    </div>
  );

  return (
    <form
      id={formId}
      onSubmit={(event) => submit(event, onEmptySubmit)}
      data-search-small
      data-search-variant={variant}
      className={
        variant === "hero"
          ? "flex min-h-25 w-full max-w-92.5 min-w-0 flex-col items-start gap-3 rounded-[22px] bg-white p-4 shadow-sm"
          : "flex flex-col gap-2 pb-3"
      }
    >
      <label htmlFor={inputId} className="text-[13px] text-[#8E8E93]">
        Повна назва вулиці та номер будинку
      </label>
      <div
        className={`address-search-panel relative w-full ${variant === "map" ? "max-w-100" : ""} ${isOpen ? "is-open" : ""}`}
      >
        <div
          className="address-search-field flex w-full items-center gap-2 px-3 py-2"
        >
          <SearchIcon className="size-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={isOpen ? `${inputId}-list` : undefined}
            aria-activedescendant={
              isOpen && activeIndex >= 0
                ? `${inputId}-option-${activeIndex}`
                : undefined
            }
            aria-describedby={validation ? `${inputId}-error` : undefined}
            aria-invalid={isInvalid}
            placeholder={
              variant === "hero" ? addressHintStart : "Введіть вулицю або адресу"
            }
            className="w-full min-w-0 bg-transparent text-sm text-black outline-none placeholder:text-[#8E8E93]"
            value={value}
            onChange={(event) => changeValue(event.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              aria-label="Очистити адресу"
              className="shrink-0 text-[#8E8E93] transition-opacity hover:opacity-70"
            >
              <ClearInput className="size-4" />
            </button>
          )}
          {variant === "hero" && (
            <button type="submit" className="address-submit">
              Знайти <ArrowRight width={17} height={17} strokeWidth={2} style={{ width: 17, height: 17 }} aria-hidden="true" />
            </button>
          )}
        </div>
        {isOpen && (
          <div className="address-results absolute top-full left-0 z-50 w-full overflow-hidden">
            <div
              id={`${inputId}-list`}
              role="listbox"
              aria-label="Знайдені адреси"
            >
              {!isLoading &&
                !error &&
                suggestions.map((item, index) => (
                  <div
                    key={item.id}
                    id={`${inputId}-option-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void selectSuggestion(item)}
                    className={`cursor-pointer border-b border-gray-50 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${activeIndex === index ? "bg-blue-50 text-blue-700" : "text-black"}`}
                  >
                    {item.address}
                    {!item.isComplete && (
                      <div className="inline-text block text-xs text-zinc-500">
                        Додайте номер будинку
                      </div>
                    )}
                  </div>
                ))}
            </div>
            {isLoading ? (
              <div
                role="status"
                className="text-block px-4 py-2.5 text-sm text-zinc-500"
              >
                Пошук адрес…
              </div>
            ) : error ? (
              <div
                role="alert"
                className="text-block px-4 py-2.5 text-sm text-red-600"
              >
                {error}
              </div>
            ) : (
              suggestions.length === 0 && (
                <div
                  role="status"
                  className="text-block px-4 py-2.5 text-sm text-zinc-500"
                >
                  {hasHouse
                    ? "Адресу не знайдено. Уточніть назву вулиці та номер."
                    : "Введіть повну назву вулиці та номер будинку"}
                </div>
              )
            )}
            {variant === "hero" &&
              !isLoading &&
              !error &&
              suggestions.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2">
                  {attribution}
                </div>
              )}
          </div>
        )}
      </div>
      {validation && (
        <div
          id={`${inputId}-error`}
          role="alert"
          className="text-block text-xs text-red-600"
        >
          {validation}
        </div>
      )}
    </form>
  );
}
