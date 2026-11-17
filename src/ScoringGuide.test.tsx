// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ScoringGuide from "./ScoringGuide";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("opens the formula guide with the effective radii supplied by the API", () => {
  const open = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: open,
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: close,
  });
  render(
    <ScoringGuide
      config={{
        point_types: [
          {
            type: "pharmacy",
            category: "health",
            radii: [0, 600, 1200],
            effective_radii: [300, 600, 1200],
          },
        ],
        system_weights: { health: 1 },
      }}
    />,
  );
  fireEvent.click(
    screen.getByText("Як рахується оцінка", { selector: "button" }),
  );
  expect(open).toHaveBeenCalledOnce();
  const dialog = screen.getByRole("dialog");
  const row = within(dialog).getByText("pharmacy").closest("tr")!;
  expect(row.textContent).toContain("Здоров’я3006001200");
  expect(within(dialog).getByText(/результат = floor/).textContent).toContain(
    "системна вага",
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Закрити гайд" }));
  expect(close).toHaveBeenCalledOnce();
});
