export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; label: string };

export type ListItemNode = {
  lines: InlineNode[][];
  children: ListBlock[];
};

export type ListBlock = {
  type: "list";
  ordered: boolean;
  start?: number;
  items: ListItemNode[];
};

export type AnswerBlock =
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "heading"; content: InlineNode[] }
  | { type: "codeBlock"; text: string }
  | ListBlock;

const HEADING_RE = /^#{1,6}\s+(.+)$/;
const BOLD_LABEL_RE = /^\*\*([^*]+)\*\*:?$/;
const UNORDERED_ITEM_RE = /^([ \t]*)[-*•]\s+(.+)$/;
const ORDERED_ITEM_RE = /^([ \t]*)(\d+)[.)]\s+(.+)$/;
const BARE_URL_RE = /^(?:https?:\/\/|www\.)[^\s<>]+/i;
const UNSAFE_SCHEME_RE = /^(?:javascript|data|vbscript|file):/i;
const TRAILING_PUNCT_RE = /[.,;:!?"'»]$/;

const H3_HEX = "(?:\\*\\*|\\*|`)?\\b8[0-9a-f]{14}\\b(?:\\*\\*|\\*|`)?";
const H3_PAREN_RE = new RegExp(
  "(?:[ \\t]*\\n)?[ \\t]*\\(\\s*(?:(?:\\*\\*|\\*|`)?(?:h3(?:[_\\s-]?id)?|id)(?:\\*\\*|\\*|`)?\\s*[:=\\-–—]?\\s*)?" +
    H3_HEX +
    "\\s*\\)",
  "gi",
);
const H3_LABELED_RE = new RegExp(
  "(?:\\*\\*|\\*|`)?h3(?:[_\\s-]?id)?(?:\\*\\*|\\*|`)?\\s*[:=\\-–—]?\\s*" + H3_HEX,
  "gi",
);
const H3_AFTER_NOUN_RE = new RegExp(
  "(?<!\\p{L})(гексі|гексагоні|гексагону|гексу|ділянки|ділянці)\\s+" + H3_HEX,
  "giu",
);

function stripTechnicalH3Ids(text: string): string {
  const withoutParens = text.replace(H3_PAREN_RE, "");
  return withoutParens
    .split("\n")
    .map((line) => {
      const match = /^([ \t]*)(.*)$/.exec(line);
      if (!match) return line;
      const [, indent, body] = match;
      const cleaned = body
        .replace(H3_LABELED_RE, "")
        .replace(H3_AFTER_NOUN_RE, "$1")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\s+([.,;:!?])/g, "$1")
        .trim();
      return cleaned ? `${indent}${cleaned}` : "";
    })
    .join("\n");
}

function measureIndent(prefix: string): number {
  let width = 0;
  for (const ch of prefix) {
    width += ch === "\t" ? 2 : 1;
  }
  return width;
}

export function sanitizeSafeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".") &&
      !parsed.hostname.startsWith(".") &&
      !parsed.hostname.endsWith(".")
    ) {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

function stripTrailingPunctuation(url: string): string {
  let result = url;
  while (result.length > 0) {
    if (TRAILING_PUNCT_RE.test(result)) {
      result = result.slice(0, -1);
      continue;
    }
    if (result.endsWith(")")) {
      const opens = (result.match(/\(/g) ?? []).length;
      const closes = (result.match(/\)/g) ?? []).length;
      if (closes > opens) {
        result = result.slice(0, -1);
        continue;
      }
    }
    if (result.endsWith("]")) {
      const opens = (result.match(/\[/g) ?? []).length;
      const closes = (result.match(/\]/g) ?? []).length;
      if (closes > opens) {
        result = result.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return result;
}

function findMatchingParen(text: string, startIndex: number): number {
  let depth = 1;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) return -1;
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findClosingDoubleStar(text: string, startIndex: number): number {
  let pos = startIndex;
  while (pos < text.length) {
    const end = text.indexOf("**", pos);
    if (end === -1) return -1;
    if (end > startIndex && !/\s/.test(text[end - 1])) {
      return end;
    }
    pos = end + 1;
  }
  return -1;
}

function findClosingSingleStar(text: string, startIndex: number): number {
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === "*") {
      if (text[i + 1] === "*" || text[i - 1] === "*") {
        continue;
      }
      if (i > startIndex && !/\s/.test(text[i - 1])) {
        return i;
      }
    }
  }
  return -1;
}

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = "";

  const flushText = () => {
    if (!buffer) return;
    const prev = nodes[nodes.length - 1];
    if (prev && prev.type === "text") {
      prev.text += buffer;
    } else {
      nodes.push({ type: "text", text: buffer });
    }
    buffer = "";
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // Inline code: `code`
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flushText();
        nodes.push({ type: "code", text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }

    // Markdown link: [label](url)
    if (ch === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket > i + 1 && text[closeBracket + 1] === "(") {
        const label = text.slice(i + 1, closeBracket);
        const closeParen = findMatchingParen(text, closeBracket + 2);
        if (closeParen !== -1 && label.trim() && !label.includes("[")) {
          const rawUrl = text.slice(closeBracket + 2, closeParen).trim();
          const safeHref = sanitizeSafeUrl(rawUrl);
          if (safeHref) {
            flushText();
            nodes.push({ type: "link", href: safeHref, label: label.trim() });
            i = closeParen + 1;
            continue;
          }
          if (UNSAFE_SCHEME_RE.test(rawUrl)) {
            buffer += label.trim();
            i = closeParen + 1;
            continue;
          }
          buffer += text.slice(i, closeParen + 1);
          i = closeParen + 1;
          continue;
        }
      }
      buffer += ch;
      i += 1;
      continue;
    }

    // Bold: **text**
    if (ch === "*" && text[i + 1] === "*") {
      if (i + 2 < text.length && !/\s/.test(text[i + 2])) {
        const end = findClosingDoubleStar(text, i + 2);
        if (end > i + 2) {
          flushText();
          nodes.push({
            type: "strong",
            children: parseInline(text.slice(i + 2, end)),
          });
          i = end + 2;
          continue;
        }
      }
      buffer += "**";
      i += 2;
      continue;
    }

    // Italic: *text*
    if (
      ch === "*" &&
      text[i + 1] !== "*" &&
      i + 1 < text.length &&
      !/\s/.test(text[i + 1]) &&
      (i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1]))
    ) {
      const end = findClosingSingleStar(text, i + 1);
      if (end > i + 1) {
        flushText();
        nodes.push({
          type: "em",
          children: parseInline(text.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }

    // Bare URL: https://..., http://..., www....
    if (i === 0 || /[\s([{"'«]/.test(text[i - 1])) {
      const urlMatch = BARE_URL_RE.exec(text.slice(i));
      if (urlMatch) {
        const candidate = stripTrailingPunctuation(urlMatch[0]);
        const safeHref = sanitizeSafeUrl(candidate);
        if (safeHref && candidate.length > 0) {
          flushText();
          nodes.push({ type: "link", href: safeHref, label: candidate });
          i += candidate.length;
          continue;
        }
      }
    }

    buffer += ch;
    i += 1;
  }

  flushText();
  return nodes;
}

export function parseChatAnswer(raw: string): AnswerBlock[] {
  const normalized = stripTechnicalH3Ids(raw.replace(/\r\n?/g, "\n"));
  if (!normalized.trim()) return [];

  const lines = normalized.split("\n");
  const blocks: AnswerBlock[] = [];
  let paragraphLines: InlineNode[][] = [];
  const listStack: Array<{ indent: number; block: ListBlock }> = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
      paragraphLines = [];
    }
  };

  const resetLists = () => {
    listStack.length = 0;
  };

  const pushListItem = (indent: number, ordered: boolean, start: number | undefined, text: string) => {
    flushParagraph();
    const item: ListItemNode = { lines: [parseInline(text)], children: [] };

    while (listStack.length > 0 && indent < listStack[listStack.length - 1].indent) {
      listStack.pop();
    }

    if (listStack.length > 0) {
      const top = listStack[listStack.length - 1];
      if (indent > top.indent) {
        const nested: ListBlock = {
          type: "list",
          ordered,
          start: ordered ? start : undefined,
          items: [item],
        };
        top.block.items[top.block.items.length - 1].children.push(nested);
        listStack.push({ indent, block: nested });
        return;
      }
      if (top.block.ordered === ordered) {
        top.block.items.push(item);
        return;
      }
      listStack.pop();
    }

    const nextList: ListBlock = {
      type: "list",
      ordered,
      start: ordered ? start : undefined,
      items: [item],
    };

    if (listStack.length > 0) {
      const parent = listStack[listStack.length - 1].block;
      parent.items[parent.items.length - 1].children.push(nextList);
    } else {
      blocks.push(nextList);
    }
    listStack.push({ indent, block: nextList });
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (!line.trim()) {
      flushParagraph();
      resetLists();
      continue;
    }

    // Fenced code block (falls back to plain text if unclosed)
    if (line.trimStart().startsWith("```")) {
      let closingIdx = -1;
      for (let j = idx + 1; j < lines.length; j++) {
        if (lines[j].trim() === "```") {
          closingIdx = j;
          break;
        }
      }
      if (closingIdx !== -1) {
        flushParagraph();
        resetLists();
        blocks.push({
          type: "codeBlock",
          text: lines.slice(idx + 1, closingIdx).join("\n"),
        });
        idx = closingIdx;
        continue;
      }
    }

    const headingMatch = HEADING_RE.exec(line.trim());
    if (headingMatch) {
      flushParagraph();
      resetLists();
      blocks.push({ type: "heading", content: parseInline(headingMatch[1].trim()) });
      continue;
    }

    const boldLabelMatch = BOLD_LABEL_RE.exec(line.trim());
    if (boldLabelMatch) {
        flushParagraph();
        resetLists();
        const label = line.trim().endsWith(":")
            ? `${boldLabelMatch[1].trim()}:`
            : boldLabelMatch[1].trim();
        blocks.push({ type: "heading", content: [{ type: "text", text: label }] });
        continue;
    }

    const unorderedMatch = UNORDERED_ITEM_RE.exec(line);
    if (unorderedMatch) {
      pushListItem(measureIndent(unorderedMatch[1]), false, undefined, unorderedMatch[2].trim());
      continue;
    }

    const orderedMatch = ORDERED_ITEM_RE.exec(line);
    if (orderedMatch) {
      pushListItem(
        measureIndent(orderedMatch[1]),
        true,
        Number.parseInt(orderedMatch[2], 10),
        orderedMatch[3].trim(),
      );
      continue;
    }

    // Indented continuation line inside an active list item
    if (listStack.length > 0) {
      const leading = /^[ \t]*/.exec(line)?.[0] ?? "";
      const top = listStack[listStack.length - 1];
      if (measureIndent(leading) > top.indent) {
        top.block.items[top.block.items.length - 1].lines.push(parseInline(line.trim()));
        continue;
      }
      resetLists();
    }

    paragraphLines.push(parseInline(line.trim()));
  }

  flushParagraph();
  return blocks;
}