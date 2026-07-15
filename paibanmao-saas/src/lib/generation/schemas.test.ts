import { describe, expect, it } from "vitest";

import { generateFiveEntrySchema } from "./schemas";

describe("five entry generation input", () => {
  it("keeps the existing short-topic flow", () => {
    const parsed = generateFiveEntrySchema.parse({ topic: "普通人做公众号还有机会吗" });
    expect(parsed.inputMode).toBe("topic");
    expect(parsed.adaptationMode).toBe("adapt");
  });

  it("accepts a long pasted transcript without a separate topic", () => {
    const parsed = generateFiveEntrySchema.safeParse({
      inputMode: "material",
      sourceText: "这是一段播客转写内容。".repeat(10),
      adaptationMode: "original",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects short material and non-web URLs", () => {
    expect(generateFiveEntrySchema.safeParse({ inputMode: "material", sourceText: "太短" }).success).toBe(false);
    expect(generateFiveEntrySchema.safeParse({ inputMode: "url", sourceUrl: "file:///etc/passwd" }).success).toBe(false);
  });
});
