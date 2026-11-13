// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryScore } from "../components/map/CategoryScore";
import type { CategoryRating } from "../lib/hexagonAssessment";

afterEach(cleanup);

const item: CategoryRating = {
  category: "food",
  score: 75,
  enabled: true,
  weight: 1,
  adjusted_score: 75,
  explanation: "  Поруч є продуктові магазини.  ",
};

describe("category score", () => {
  it("shows the score and explanation and connects the disclosure to its panel", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <CategoryScore
        title="Їжа"
        item={item}
        open={false}
        onToggle={onToggle}
      />,
    );
    const button = screen.getByRole("button", { name: "Пояснення: Їжа" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region")).toBeNull();
    expect(
      screen.getByRole("meter", { name: "Їжа" }).getAttribute("value"),
    ).toBe("75");
    await user.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(
      <CategoryScore title="Їжа" item={item} open onToggle={onToggle} />,
    );
    const panel = screen.getByRole("region", { name: "Пояснення: Їжа" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(button.id);
    expect(panel.hasAttribute("inert")).toBe(false);
    expect(panel.textContent).toBe("Поруч є продуктові магазини.");
  });

  it("explains that a disabled category is excluded and resets its meter", () => {
    render(
      <CategoryScore
        title="Їжа"
        item={{ ...item, enabled: false }}
        open
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("Вимкнено")).toBeTruthy();
    expect(
      screen.getByText("Не враховується в загальній оцінці."),
    ).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("value")).toBe("0");
  });

  it("renders missing data with an empty meter and fallback explanation", () => {
    render(
      <CategoryScore title="Їжа" item={undefined} open onToggle={vi.fn()} />,
    );
    expect(screen.getByText("Немає даних")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("value")).toBe("0");
    expect(screen.getByText("Дані для пояснення поки відсутні.")).toBeTruthy();
  });
});
