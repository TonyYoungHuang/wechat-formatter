import { z } from "zod";

import { WECHAT_THEME_IDS } from "./types";

const inlineSegmentSchema = z.object({
  text: z.string().max(10000),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: z.string().url().max(2000).optional(),
});

const textFields = {
  id: z.string().min(1).max(80),
  text: z.string().min(1).max(20000),
  segments: z.array(inlineSegmentSchema).max(500).optional(),
};

export const articleBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("lead"), ...textFields }),
  z.object({ type: z.literal("heading"), ...textFields, level: z.union([z.literal(2), z.literal(3)]) }),
  z.object({ type: z.literal("paragraph"), ...textFields }),
  z.object({ type: z.literal("quote"), ...textFields, source: z.string().max(160).optional() }),
  z.object({
    type: z.literal("callout"),
    ...textFields,
    tone: z.enum(["info", "tip", "important", "warning"]),
    title: z.string().max(120).optional(),
  }),
  z.object({
    type: z.literal("list"),
    id: z.string().min(1).max(80),
    ordered: z.boolean(),
    items: z.array(z.object({ text: z.string().min(1).max(3000), segments: z.array(inlineSegmentSchema).max(100).optional() })).min(1).max(80),
  }),
  z.object({ type: z.literal("steps"), id: z.string().min(1).max(80), title: z.string().max(120).optional(), items: z.array(z.string().min(1).max(3000)).min(1).max(30) }),
  z.object({
    type: z.literal("compare"),
    id: z.string().min(1).max(80),
    title: z.string().max(120).optional(),
    left: z.array(z.string().min(1).max(2000)).min(1).max(20),
    right: z.array(z.string().min(1).max(2000)).min(1).max(20),
  }),
  z.object({
    type: z.literal("dialogue"),
    id: z.string().min(1).max(80),
    title: z.string().max(120).optional(),
    items: z.array(z.object({ speaker: z.string().min(1).max(40), text: z.string().min(1).max(3000) })).min(1).max(80),
  }),
  z.object({ type: z.literal("stat"), id: z.string().min(1).max(80), value: z.string().min(1).max(80), label: z.string().min(1).max(160) }),
  z.object({ type: z.literal("image"), id: z.string().min(1).max(80), src: z.string().min(1).max(4000), alt: z.string().max(300).optional(), caption: z.string().max(300).optional() }),
  z.object({
    type: z.literal("imageGroup"),
    id: z.string().min(1).max(80),
    images: z.array(z.object({ src: z.string().min(1).max(4000), alt: z.string().max(300).optional(), caption: z.string().max(300).optional() })).min(1).max(20),
  }),
  z.object({ type: z.literal("cta"), ...textFields, title: z.string().max(120).optional() }),
  z.object({ type: z.literal("divider"), id: z.string().min(1).max(80) }),
  z.object({ type: z.literal("byline"), ...textFields, author: z.string().max(80).optional() }),
]);

export const articleDocumentSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1).max(160),
  subtitle: z.string().max(240).optional(),
  author: z.string().max(80).optional(),
  blocks: z.array(articleBlockSchema).min(1).max(300),
  source: z.object({
    type: z.enum(["plain", "markdown", "tiptap", "generated"]),
    fingerprint: z.string().min(1).max(120),
  }),
});

export const aiArticleStructureSchema = z.object({
  title: z.string().min(1).max(160),
  recommendedThemeId: z.enum(WECHAT_THEME_IDS).optional(),
  blocks: z.array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("lead"), text: z.string().min(1).max(3000) }),
      z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: z.string().min(1).max(300) }),
      z.object({ type: z.literal("paragraph"), text: z.string().min(1).max(10000) }),
      z.object({ type: z.literal("quote"), text: z.string().min(1).max(3000), source: z.string().max(160).optional() }),
      z.object({ type: z.literal("callout"), tone: z.enum(["info", "tip", "important", "warning"]), title: z.string().max(120).optional(), text: z.string().min(1).max(3000) }),
      z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(z.string().min(1).max(3000)).min(2).max(60) }),
      z.object({ type: z.literal("steps"), title: z.string().max(120).optional(), items: z.array(z.string().min(1).max(3000)).min(2).max(30) }),
      z.object({ type: z.literal("compare"), title: z.string().max(120).optional(), left: z.array(z.string().min(1).max(2000)).min(1).max(20), right: z.array(z.string().min(1).max(2000)).min(1).max(20) }),
      z.object({ type: z.literal("dialogue"), title: z.string().max(120).optional(), items: z.array(z.object({ speaker: z.string().min(1).max(40), text: z.string().min(1).max(3000) })).min(2).max(80) }),
      z.object({ type: z.literal("stat"), value: z.string().min(1).max(80), label: z.string().min(1).max(160) }),
      z.object({ type: z.literal("cta"), title: z.string().max(120).optional(), text: z.string().min(1).max(3000) }),
      z.object({ type: z.literal("divider") }),
      z.object({ type: z.literal("byline"), author: z.string().max(80).optional(), text: z.string().min(1).max(3000) }),
    ]),
  ).min(1).max(240),
  notes: z.array(z.string().min(1).max(160)).min(1).max(8),
});
