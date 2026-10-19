import { UNKNOWN_BOT_COLOR } from "@rakazo/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MentionChipIcon, MentionOptionIcon } from "./MentionIcon";

describe("Mention icons", () => {
  it.each(["group", "everyone"] as const)("renders the %s marker in both picker sizes", (kind) => {
    const mention = { kind, id: kind, name: kind };
    const marker = kind === "group" ? "G" : "@";

    expect(renderToStaticMarkup(<MentionOptionIcon mention={mention} />)).toContain(marker);
    expect(renderToStaticMarkup(<MentionChipIcon mention={mention} />)).toContain(marker);
  });

  it("uses the shared unknown-bot color when a bot has no identity color", () => {
    const html = renderToStaticMarkup(
      <MentionChipIcon mention={{ kind: "bot", id: "retired-bot", name: "Retired" }} />,
    );

    expect(html).toContain(UNKNOWN_BOT_COLOR);
  });
});
