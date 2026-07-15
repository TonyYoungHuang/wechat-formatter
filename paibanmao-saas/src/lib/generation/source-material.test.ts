import { describe, expect, it } from "vitest";

import { generateFiveEntrySchema } from "./schemas";
import { buildPersistedGenerationPayload, deriveTopicFromSource, resolveSourceMaterial } from "./source-material";

describe("source material generation", () => {
  it("derives a useful working topic from a material title", () => {
    expect(deriveTopicFromSource("昨天听到的一期播客", "正文内容")).toBe("昨天听到的一期播客");
  });

  it("keeps source text for generation but removes it from persisted job input", async () => {
    const payload = generateFiveEntrySchema.parse({
      inputMode: "material",
      sourceTitle: "副业创作者为什么总是写不下去",
      sourceText: "很多副业创作者不是没有选题，而是每次都想把一篇文章写得过于完整。".repeat(8),
      adaptationMode: "adapt",
    });
    const resolved = await resolveSourceMaterial(payload);
    const persisted = buildPersistedGenerationPayload(resolved);

    expect(resolved.payload.topic).toBe("副业创作者为什么总是写不下去");
    expect(resolved.payload.sourceText.length).toBeGreaterThan(50);
    expect(persisted).not.toHaveProperty("sourceText");
    expect(persisted.sourceMaterial.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
  });
});
