// @vitest-environment jsdom

import type { ThreadMessage } from "@rakazo/contracts";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => `${text}${values[index - 1] ?? ""}${part}`, "");
  return { Trans: ({ children }: { children: ReactNode }) => children, useLingui: () => ({ t }) };
});

import { MessageHoverActions } from "./MessageHoverActions";

const message: ThreadMessage = {
  id: "message-1",
  threadId: "thread-1",
  seq: 1,
  role: "bot",
  blocks: [{ kind: "text", text: "Ready." }],
  createdAt: "2026-10-19T00:00:00.000Z",
};

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps streaming progress bubbles free of hover actions", async () => {
  await act(async () =>
    root?.render(
      <MessageHoverActions
        message={{ ...message, id: "progress:1" }}
        side="end"
        onReply={vi.fn()}
        onReact={vi.fn()}
      />,
    ),
  );

  expect(container.querySelector('[data-testid="message-hover-actions"]')).toBeNull();
});

it("replies from the rail", async () => {
  const onReply = vi.fn();
  await act(async () =>
    root?.render(
      <MessageHoverActions message={message} side="end" onReply={onReply} onReact={vi.fn()} />,
    ),
  );

  await act(async () => {
    container.querySelector<HTMLButtonElement>('button[aria-label="Reply"]')?.click();
  });

  expect(onReply).toHaveBeenCalledExactlyOnceWith(message);
});
