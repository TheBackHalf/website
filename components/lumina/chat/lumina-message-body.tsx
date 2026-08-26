import type { ReactNode } from "react";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parsePlainBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch?.[1]) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

/** Light markdown-ish rendering — plain text only, never raw HTML. */
export function LuminaMessageBody({ content }: { content: string }) {
  const blocks = parsePlainBlocks(content);

  return (
    <div className="bh-lumina-chat-message-body">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="bh-lumina-chat-message-list">
              {block.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${index}`} className="bh-lumina-chat-message-paragraph">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={`b-${key}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={`i-${key}`}>{token.slice(1, -1)}</em>);
    }
    key += 1;
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
