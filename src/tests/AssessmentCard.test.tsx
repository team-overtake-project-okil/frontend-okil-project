// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AssessmentCard } from "../components/map/AssessmentCard";

afterEach(cleanup);
it("keeps the chat host mounted when the selection is cleared", async () => {
  const user = userEvent.setup();
  const props = {
    selectedHexId: "hex",
    assessmentData: { overall_rating: 76, categories: [] },
    showAssessmentSkeleton: false,
    isAssessmentError: false,
    assessmentError: null,
    chatOpen: false,
    isHexAttached: false,
    details: null,
    assessmentExpanded: false,
    setChatOpen: vi.fn(),
    setAssessmentExpanded: vi.fn(),
    refetchAssessment: vi.fn(),
    setChatHost: vi.fn(),
  };
  const { container, rerender } = render(<AssessmentCard {...props} />);
  expect(screen.queryByRole("button", { name: "Прибрати вибрану ділянку" })).toBeNull();
  expect(screen.getByRole("button", { name: "Закрити оцінки" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: "Режим панелі" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(props.setChatOpen).toHaveBeenCalledWith(true);
  const host = container.querySelector(".assessment-chat-host");
  await user.click(screen.getByRole("button", { name: "Категорії" }));
  expect(props.setAssessmentExpanded).toHaveBeenCalledWith(true);
  rerender(<AssessmentCard {...props} chatOpen />);
  expect(screen.getByText("76").closest("[hidden]")).toBeNull();
  expect(screen.queryByRole("button", { name: "Категорії" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Запитати за цей гексагон" }));
  expect(props.setChatOpen).toHaveBeenLastCalledWith(true);
  rerender(<AssessmentCard {...props} chatOpen selectedHexId={null} />);
  expect(container.querySelector(".assessment-chat-host")).toBe(host);
  expect(screen.queryByText("76")).toBeNull();
  expect(screen.queryByRole("button", { name: "Категорії" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  expect(props.setChatOpen).toHaveBeenCalledWith(false);
  rerender(<AssessmentCard {...props} showAssessmentSkeleton assessmentExpanded />);
  expect(screen.getByRole("status", { name: "Завантаження оцінки" })).toBeTruthy();
  expect(screen.getByRole("status", { name: "Завантаження категорій" })).toBeTruthy();
  expect(screen.queryByText("76")).toBeNull();
  expect((screen.getByRole("button", { name: "Запитати за цей гексагон" }) as HTMLButtonElement).disabled).toBe(true);
  rerender(<AssessmentCard {...props} showAssessmentSkeleton assessmentExpanded chatOpen />);
  expect(screen.getByRole("status", { name: "Завантаження оцінки" })).toBeTruthy();
  expect(screen.queryByRole("status", { name: "Завантаження категорій" })).toBeNull();
  expect(container.querySelector(".assessment-chat-host")).toBe(host);
  rerender(<AssessmentCard {...props} assessmentExpanded chatOpen />);
  expect(screen.queryByRole("status", { name: "Завантаження оцінки" })).toBeNull();
  expect(screen.getByText("76")).toBeTruthy();
});
