// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => `${text}${values[index - 1] ?? ""}${part}`, "");
  return { Trans: ({ children }: { children: ReactNode }) => children, useLingui: () => ({ t }) };
});

import { ComputerReleaseActions } from "./ComputerReleaseActions";

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

it("releases an active session without a reason", async () => {
  const onRelease = vi.fn().mockResolvedValue(undefined);
  await act(async () =>
    root?.render(<ComputerReleaseActions takeoverRequested={false} onRelease={onRelease} />),
  );

  await act(async () => {
    container.querySelector<HTMLButtonElement>("button")?.click();
  });

  expect(onRelease).toHaveBeenCalledExactlyOnceWith();
});

it("offers skip and completion while the user has control", async () => {
  const onRelease = vi.fn().mockResolvedValue(undefined);
  await act(async () =>
    root?.render(<ComputerReleaseActions takeoverRequested onRelease={onRelease} />),
  );
  const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")];

  expect(buttons.map((button) => button.textContent)).toEqual(["Skip", "I’m done"]);
  await act(async () => buttons[0]?.click());
  await act(async () => buttons[1]?.click());

  expect(onRelease.mock.calls).toEqual([["skipped"], ["done"]]);
});
