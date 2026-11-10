// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AssessmentCard } from "../components/map/AssessmentCard";

afterEach(cleanup);

it("switches assessment tabs while retaining the chat host and comparison controls", async () => {
  const user = userEvent.setup();
  const onChatOpenChange = vi.fn();
  const onAdd = vi.fn();
  const props = {
    hexId: "selected-hex",
    data: { overall_rating: 76, categories: [] },
    showSkeleton: false,
    isError: false,
    error: null,
    expanded: false,
    detailsOpen: false,
    openCategory: null,
    canAdd: true,
    added: false,
    atLimit: false,
    onClear: vi.fn(),
    onRetry: vi.fn(),
    onAdd,
    onToggleDetails: vi.fn(),
    onExpandForDetails: vi.fn(),
    onToggleCategory: vi.fn(),
    onChatOpenChange,
    chatHostRef: vi.fn(),
  };
  const { container, rerender } = render(
    <AssessmentCard {...props} chatOpen={false} />,
  );
  const host = container.querySelector(".assessment-chat-host");
  expect(host?.hasAttribute("hidden")).toBe(true);
  await user.click(screen.getByRole("button", { name: "Чат з Окіл" }));
  expect(onChatOpenChange).toHaveBeenLastCalledWith(true);
  rerender(<AssessmentCard {...props} chatOpen={true} />);
  expect(container.querySelector(".assessment-chat-host")).toBe(host);
  expect(host?.hasAttribute("hidden")).toBe(false);
  expect(
    container
      .querySelector(".assessment-category-body")
      ?.hasAttribute("hidden"),
  ).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Додати до порівняння" }),
  );
  expect(onAdd).toHaveBeenCalledOnce();
  await user.click(screen.getByRole("button", { name: "Оцінки категорій" }));
  expect(onChatOpenChange).toHaveBeenLastCalledWith(false);
});
