// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Map } from "../components/map";
import type { HexStopProperties } from "../lib/useStopsByHex";

// Exercise the real panel lifecycle without requiring WebGL or a chat server.
vi.mock("../components/MapboxMap", () => ({
  MapboxMap: ({
    onHexSelect,
    onStopInPanel,
  }: {
    onHexSelect: (id: string | null) => void;
    onStopInPanel: (stop: HexStopProperties) => boolean;
  }) => (
    <div>
      <button onClick={() => onStopInPanel({ id: 1, name: "Тестова зупинка", in_hex: true, routes: [] })}>
        Відкрити маршрути зупинки
      </button>
      <button onClick={() => onHexSelect("selected-hex")}>
        Вибрати тестову ділянку
      </button>
      <button onClick={() => onHexSelect("selected-hex-b")}>
        Вибрати іншу ділянку
      </button>
      <button onClick={() => onHexSelect(null)}>Зняти тестовий вибір</button>
    </div>
  ),
}));

let client: QueryClient;
beforeEach(() => {
  vi.stubEnv("VITE_BACKEND_URL", "https://ratings.example.test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json(
        url.includes("/hexagons/")
          ? {
              h3_id: url.includes("selected-hex-b")
                ? "selected-hex-b"
                : "selected-hex",
              overall_rating: url.includes("selected-hex-b") ? 72 : 94,
              categories: [
                {
                  category: "mobility",
                  score: 100,
                  enabled: true,
                  weight: 1,
                  adjusted_score: 100,
                  explanation: "Поруч є зупинки.",
                },
              ],
            }
          : [{ h3_id: "selected-hex", overall_rating: 94 }],
      ),
    ),
  );
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup() {
  render(
    <QueryClientProvider client={client}>
      <Map
        searchedLocation={null}
        onAddressChange={vi.fn()}
        clearSelectionKey={0}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

it("opens assessments without opening the assistant", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
  expect(screen.getByRole("button", { name: "Запитати за цей гексагон" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
});

it("preserves the draft between independent panel modes and after closing chat", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  await user.type(screen.getByLabelText("Твоє запитання"), "Моя чернетка");
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  expect(screen.queryByRole("region", { name: "Чат із помічником" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  expect(screen.queryByRole("button", { name: "Оцінки ділянки" })).toBeNull();
});

it("attaches an area only through the explicit assessment action", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  const question = "Які слабкі сторони цієї ділянки?";
  await user.click(screen.getByRole("button", { name: question }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe(question);
  expect(screen.queryByText(question, { selector: ".chat-message p" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Вибрати іншу ділянку" }));
  await screen.findByText("72", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(screen.getByText("72", { selector: ".score-value" }).closest("[hidden]")).toBeNull();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  expect(screen.getByRole("button", { name: "Як обрати ділянку для життя?" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(screen.getByText("Про цей гексагон: 72/100")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Прибрати ділянку з контексту" }));
  expect(screen.queryByText("Про цей гексагон: 72/100")).toBeNull();
});

it("offers general questions when no area is attached", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  await user.click(screen.getByRole("button", { name: "Що означають оцінки категорій?" }));
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Що означають оцінки категорій?");
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Що означають оцінки категорій?");
  await user.click(screen.getByRole("button", { name: "Вибрати іншу ділянку" }));
  await screen.findByText("72", { selector: ".score-value" });
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Що означають оцінки категорій?");
  expect(screen.queryByText("Про цей гексагон: 72/100")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Зняти тестовий вибір" }));
  expect(screen.getByLabelText("Твоє запитання")).toBeTruthy();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
});

it("attaches the selected hexagon from the toolbar assistant without losing the draft", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  await user.type(screen.getByLabelText("Твоє запитання"), "Моя чернетка");
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(screen.getByText("Про цей гексагон: 94/100")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Гексагон додано" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("Моя чернетка");
  expect(screen.queryByText("Моя чернетка", { selector: ".chat-message p" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Вибрати іншу ділянку" }));
  await screen.findByText("72", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(screen.getByText("Про цей гексагон: 72/100")).toBeTruthy();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  expect((screen.getByRole("button", { name: "Гексагон додано" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "Прибрати ділянку з контексту" }));
  expect((screen.getByRole("button", { name: "Запитати за цей гексагон" }) as HTMLButtonElement).disabled).toBe(false);
});

it("keeps all comparison actions in the separate comparison panel", async () => {
  const user = setup();
  await user.click(
    screen.getByRole("button", { name: "Вибрати тестову ділянку" }),
  );
  await screen.findByText("94", { selector: ".score-value" });
  expect(
    screen.queryByRole("button", { name: "Додати до порівняння" }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Порівняти ділянки" }));
  const add = screen.getByRole("button", { name: "Додати вибрану ділянку" });
  expect(add.closest('[aria-label="Порівняння ділянок"]')).toBeTruthy();
  await user.click(add);
  expect(screen.getByText("Порівняння · 1/3")).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "Вибрану ділянку вже додано",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Вибрати іншу ділянку" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Додати вибрану ділянку" }),
  );
  expect(screen.getByText("Порівняння · 2/3")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Порівняти" }));
  expect(screen.getByRole("table")).toBeTruthy();
});

it("restores the selected assessment after toggling the assistant twice", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(screen.getByLabelText("Твоє запитання")).toBeTruthy();
  expect(screen.queryByText("Про цей гексагон: 94/100")).toBeNull();
  expect(screen.getByText("94", { selector: ".score-value" }).closest("[hidden]")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(screen.queryByRole("textbox", { name: "Твоє запитання" })).toBeNull();
  expect(screen.getByText("94", { selector: ".score-value" }).closest("[hidden]")).toBeNull();
});

it("grows the composer with text and shrinks it after clearing", async () =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  const input = screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement;
  let height = 78;
  Object.defineProperty(input, "scrollHeight", { configurable: true, get: () => height });
  await user.type(input, "Кілька рядків");
  expect(input.style.height).toBe("78px");
  height = 200;
  await user.type(input, " і довше запитання");
  expect(input.style.height).toBe("128px");
  expect(input.style.overflowY).toBe("auto");
  height = 30;
  await user.clear(input);
  expect(input.style.height).toBe("32px");
  expect(input.style.overflowY).toBe("hidden");
});

it.each(["Пріоритети", "Відкрити маршрути зупинки"])("keeps the left panel open when opening the assistant from %s", async (name) =>
{
  const user = setup();
  await user.click(screen.getByRole("button", { name }));
  const panel = document.getElementById("weights-panel");
  expect(panel).not.toBeNull();
  const routesOpen = panel?.classList.contains("is-stop");
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(document.getElementById("weights-panel")).toBe(panel);
  expect(panel?.classList.contains("is-stop")).toBe(routesOpen);
  expect(screen.getByLabelText("Твоє запитання")).toBeTruthy();
});

it("hides the legend and zoom controls only while categories or chat are open", async () =>
{
  const user = setup();
  const map = document.getElementById("map")!;
  const legend = map.querySelector<HTMLElement>(".map-legend")!;
  const check = (hidden: boolean) =>
  {
    expect(legend.hidden).toBe(hidden);
    expect(map.classList.contains("map-details-open")).toBe(hidden);
  };
  check(false);
  await user.click(screen.getByRole("button", { name: "Вибрати тестову ділянку" }));
  await screen.findByText("94", { selector: ".score-value" });
  check(false);
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  check(true);
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  check(false);
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  check(true);
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  check(false);
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  check(true);
  await user.click(screen.getByRole("button", { name: "Закрити оцінки" }));
  check(false);
});
