// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Map } from "../components/map";

// Exercise the real panel lifecycle without requiring WebGL or a chat server.
vi.mock("../components/MapboxMap", () => ({
  MapboxMap: ({
    onHexSelect,
  }: {
    onHexSelect: (id: string | null) => void;
  }) => (
    <div>
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

it("keeps the assistant and pinned draft context after deselecting the hexagon", async () => {
  const user = setup();
  await user.click(
    screen.getByRole("button", { name: "Вибрати тестову ділянку" }),
  );
  await screen.findByText("94", { selector: ".score-value" });
  expect(screen.getByText("Про цю ділянку · 94/100")).toBeTruthy();
  await user.type(screen.getByLabelText("Твоє запитання"), "Що тут поруч?");
  await user.click(
    screen.getByRole("button", { name: "Зняти тестовий вибір" }),
  );
  expect(screen.queryByText("94", { selector: ".score-value" })).toBeNull();
  expect(
    (screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value,
  ).toBe("Що тут поруч?");
  expect(screen.getByText("Про цю ділянку · 94/100")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Чат із помічником" }),
    ).toBeNull(),
  );
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  expect(
    (screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value,
  ).toBe("Що тут поруч?");
});

it("expands categories without hiding the conversation or its draft", async () => {
  const user = setup();
  await user.click(
    screen.getByRole("button", { name: "Вибрати тестову ділянку" }),
  );
  await screen.findByText("94", { selector: ".score-value" });
  await user.type(screen.getByLabelText("Твоє запитання"), "Порівняй райони");
  await user.click(screen.getByRole("button", { name: "Оцінки категорій" }));
  expect(
    screen.getByText("Відстані по прямій від центру гексагону."),
  ).toBeTruthy();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Твоє запитання",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Порівняй райони");
  await user.click(screen.getByRole("button", { name: "Оцінки категорій" }));
  expect(
    screen.getByRole("region", { name: "Чат із помічником" }),
  ).toBeTruthy();
});

it("follows selection while idle, pins context while typing, and allows opting out", async () => {
  const user = setup();
  await user.click(
    screen.getByRole("button", { name: "Вибрати тестову ділянку" }),
  );
  await screen.findByText("Про цю ділянку · 94/100");
  await user.click(
    screen.getByRole("button", { name: "Вибрати іншу ділянку" }),
  );
  await screen.findByText("Про цю ділянку · 72/100");
  await user.type(
    screen.getByRole("textbox", { name: "Твоє запитання" }),
    "Який транспорт?",
  );
  await user.click(
    screen.getByRole("button", { name: "Вибрати тестову ділянку" }),
  );
  await screen.findByText("94", { selector: ".score-value" });
  expect(screen.getByText("Про цю ділянку · 72/100")).toBeTruthy();
  expect(screen.queryByText("Про цю ділянку · 94/100")).toBeNull();
  await user.click(
    screen.getByRole("button", { name: "Прибрати ділянку з контексту" }),
  );
  expect(screen.queryByText("Про цю ділянку · 72/100")).toBeNull();
});

it("does not silently attach a selection to a question already started without context", async () => {
  const user = setup();
  await user.click(screen.getByRole("button", { name: "Помічник Окіл" }));
  await user.type(screen.getByLabelText("Твоє запитання"), "Розкажи про Львів");
  await user.click(
    screen.getByRole("button", { name: "Вибрати тестову ділянку" }),
  );
  await screen.findByText("94", { selector: ".score-value" });
  expect(screen.queryByText("Про цю ділянку · 94/100")).toBeNull();
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
