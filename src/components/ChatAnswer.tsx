import { Fragment } from "react";
import { parseChatAnswer } from "../lib/formatChatAnswer";
import type { AnswerBlock, InlineNode, ListBlock } from "../lib/formatChatAnswer";

function renderInline(nodes: InlineNode[], keyPrefix: string) {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.text}</Fragment>;
      case "strong":
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children, key)}</em>;
      case "code":
        return (
          <code key={key} className="chat-answer-code">
            {node.text}
          </code>
        );
      case "link":
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-answer-link"
          >
            {node.label}
          </a>
        );
    }
  });
}

function renderLines(lines: InlineNode[][], keyPrefix: string) {
  return lines.map((line, index) => (
    <Fragment key={`${keyPrefix}-line-${index}`}>
      {index > 0 && <br />}
      {renderInline(line, `${keyPrefix}-line-${index}`)}
    </Fragment>
  ));
}

function renderList(block: ListBlock, keyPrefix: string) {
  const ListTag = block.ordered ? "ol" : "ul";
  const start = block.ordered && block.start && block.start !== 1 ? block.start : undefined;

  return (
    <ListTag key={keyPrefix} start={start} className="chat-answer-list">
      {block.items.map((item, idx) => {
        const itemKey = `${keyPrefix}-item-${idx}`;
        return (
          <li key={itemKey}>
            {renderLines(item.lines, itemKey)}
            {item.children.map((child, childIdx) =>
              renderList(child, `${itemKey}-sub-${childIdx}`),
            )}
          </li>
        );
      })}
    </ListTag>
  );
}

function renderBlock(block: AnswerBlock, index: number) {
  const key = `block-${index}`;
  switch (block.type) {
    case "paragraph":
      return (
        <p key={key} className="chat-answer-paragraph">
          {renderLines(block.lines, key)}
        </p>
      );
    case "heading":
      return (
        <p key={key} className="chat-answer-heading">
          {renderInline(block.content, key)}
        </p>
      );
    case "codeBlock":
      return (
        <pre key={key} className="chat-answer-pre">
          <code>{block.text}</code>
        </pre>
      );
    case "list":
      return renderList(block, key);
  }
}

export function ChatAnswer({ content }: { content: string }) {
  const blocks = parseChatAnswer(content);
  if (blocks.length === 0) {
    return <div className="chat-answer">{content}</div>;
  }

  return <div className="chat-answer">{blocks.map(renderBlock)}</div>;
}