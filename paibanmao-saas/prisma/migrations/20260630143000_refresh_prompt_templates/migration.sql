UPDATE "PromptTemplate"
SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" IN ('five_entry_generation', 'topic_generation', 'image_prompt_generation');

INSERT INTO "PromptTemplate" ("id", "key", "version", "content", "active", "createdAt", "updatedAt")
VALUES
  (
    'prompt_five_entry_generation_v2',
    'five_entry_generation',
    2,
    E'选题：{{topic}}\n内容目标：{{goal}}\n账号名称：{{accountName}}\n领域：{{niche}}\n人设：{{persona}}\n目标读者：{{audience}}\n读者痛点：{{audiencePainPoints}}\n产品或服务：{{productOrService}}\n变现方式：{{monetizationMethods}}\n语气风格：{{tone}}\n常用 CTA：{{commonCta}}\n禁用表达：{{forbiddenWords}}\n参考样文：{{sampleText}}\n\n请生成公众号、小绿书、搜一搜、问一问、朋友圈五个微信入口内容。\n每个入口都要适配对应场景，不要简单复制同一段内容。\n小绿书入口需要在 metadata.imagePrompts 中给出图片提示词。\n搜一搜入口需要在 metadata.keywords 中给出关键词。\n不要承诺 guaranteed 流量、收入、排名、审核通过或高风险结果。',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'prompt_topic_generation_v2',
    'topic_generation',
    2,
    E'账号名称：{{accountName}}\n领域：{{niche}}\n人设：{{persona}}\n目标读者：{{audience}}\n读者痛点：{{audiencePainPoints}}\n产品或服务：{{productOrService}}\n变现方式：{{monetizationMethods}}\n语气风格：{{tone}}\n常用 CTA：{{commonCta}}\n禁用表达：{{forbiddenWords}}\n参考样文：{{sampleText}}\n本次主题：{{theme}}\n变现目标：{{monetizationGoal}}\n避免方向：{{avoid}}\n生成数量：{{count}}\n\n请生成一组适合公众号、小绿书、搜一搜、问一问和朋友圈复用的微信内容选题。\n每个选题需要包含：title、reason、goals、entries。',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'prompt_image_prompt_generation_v2',
    'image_prompt_generation',
    2,
    E'主题：{{topic}}\n图片场景：{{scene}}\n视觉风格：{{style}}\n\n请生成适合微信图文、小绿书或公众号封面的中文图片提示词。\n只输出提示词建议，不要调用真实图片生成。',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key", "version") DO UPDATE
SET
  "content" = EXCLUDED."content",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
