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
    chatOpen: true,
    assessmentExpanded: false,
    setChatOpen: vi.fn(),
    setSelectedHexId: vi.fn(),
    setAssessmentExpanded: vi.fn(),
    onAddressChange: vi.fn(),
    refetchAssessment: vi.fn(),
    setChatHost: vi.fn(),
  };
  const { container, rerender } = render(<AssessmentCard {...props} />);
  const host = container.querySelector(".assessment-chat-host");
  await user.click(screen.getByRole("button", { name: "Оцінки категорій" }));
  expect(props.setAssessmentExpanded).toHaveBeenCalledWith(true);
  rerender(<AssessmentCard {...props} selectedHexId={null} />);
  expect(container.querySelector(".assessment-chat-host")).toBe(host);
  expect(screen.queryByText("76")).toBeNull();
  expect(screen.queryByRole("button", { name: "Оцінки категорій" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Закрити чат" }));
  expect(props.setChatOpen).toHaveBeenCalledWith(false);
});
