// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatAnswer } from "../components/ChatAnswer";

afterEach(cleanup);

describe("ChatAnswer formatting", () => {
  it("renders paragraphs and preserves single line breaks", () => {
    const content = "Перший рядок\nДругий рядок\n\nНовий абзац";
    const { container } = render(<ChatAnswer content={content} />);

    const paragraphs = container.querySelectorAll("p.chat-answer-paragraph");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].querySelectorAll("br")).toHaveLength(1);
    expect(paragraphs[0].textContent).toBe("Перший рядокДругий рядок");
    expect(paragraphs[1].textContent).toBe("Новий абзац");
  });

  it("renders unordered, ordered, and nested lists including backend POI format", () => {
    const content = [
      "У гексі 892a100d2c7ffff знайдено 3 об'єкти:",
      "- Їжа — Кафе (2): Світ Кави, Вірменка",
      "  - Додатково: поруч зупинка",
      "- Спорт — Спортзал (1): SportLife",
      "Зупинок громадського транспорту в цьому гексі немає.",
      "",
      "1. Перший крок",
      "2. Другий крок",
    ].join("\n");

    const { container } = render(<ChatAnswer content={content} />);

    const lists = container.querySelectorAll("ul.chat-answer-list");
    expect(lists).toHaveLength(2);
    expect(within(lists[0] as HTMLElement).getByText(/Їжа — Кафе/)).toBeTruthy();
    expect(within(lists[1] as HTMLElement).getByText("Додатково: поруч зупинка")).toBeTruthy();

    const ordered = container.querySelector("ol.chat-answer-list");
    expect(ordered).not.toBeNull();
    expect(ordered?.querySelectorAll("li")).toHaveLength(2);
    expect(screen.getByText("Зупинок громадського транспорту в цьому гексі немає.")).toBeTruthy();
  });

  it("renders safe Markdown and bare links with secure attributes and strips trailing punctuation", () => {
    const content =
      "Деталі на [сайті Окіл](https://okil.lviv.ua/map) або за адресою https://city-adm.lviv.ua/news.";
    render(<ChatAnswer content={content} />);

    const mdLink = screen.getByRole("link", { name: "сайті Окіл" });
    expect(mdLink.getAttribute("href")).toBe("https://okil.lviv.ua/map");
    expect(mdLink.getAttribute("target")).toBe("_blank");
    expect(mdLink.getAttribute("rel")).toBe("noopener noreferrer");

    const bareLink = screen.getByRole("link", { name: "https://city-adm.lviv.ua/news" });
    expect(bareLink.getAttribute("href")).toBe("https://city-adm.lviv.ua/news");
  });

  it("blocks unsafe link schemes and renders raw HTML safely as plain text", () => {
    const content =
      'Небезпечно: [натисни](javascript:alert(1)) і <script>alert("xss")</script> та <img src=x onerror=alert(1)>';
    const { container } = render(<ChatAnswer content={content} />);

    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("натисни");
    expect(container.textContent).toContain('<script>alert("xss")</script>');
  });

  it("falls back to readable plain text on malformed or unclosed formatting", () => {
    const content = [
      "Незакритий **жирний текст і `код без закриття",
      "Бите [посилання](not-a-valid-url) та [інше](https://unclosed",
      "```",
      "незакритий блок коду",
    ].join("\n");

    const { container } = render(<ChatAnswer content={content}/>);

    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("pre")).toBeNull();
    expect(container.textContent).toContain("Незакритий **жирний текст");
    expect(container.textContent).toContain("Бите [посилання](not-a-valid-url)");
    expect(container.textContent).toContain("незакритий блок коду");
  });

  it("keeps long unbroken tokens and URLs inside the chat container classes", () => {
    const longUrl = "https://example.com/" + "a".repeat(250);
    const { container } = render(<ChatAnswer content={longUrl}/>);

    const wrapper = container.querySelector(".chat-answer");
    const link = screen.getByRole("link", { name: longUrl });
    expect(wrapper).not.toBeNull();
    expect(link.classList.contains("chat-answer-link")).toBe(true);
  });
}); 