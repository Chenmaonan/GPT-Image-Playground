import { z } from 'zod';
import type { GatewayConfig } from './config.js';
import { AppError } from './errors.js';
import type { PlanInputView, PlanPreferences, PlannerDraft } from './types.js';

export const POLICY_VERSION = 'restricted-image-v1';
export const ALLOWED_SIZES = ['auto', '1024x1024', '1536x1024', '1024x1536'] as const;

const planStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  operation: z.enum(['generate', 'edit']),
}).strict();

const generationSchema = z.object({
  exactPrompt: z.string().trim().min(1).max(16_000),
  action: z.enum(['generate', 'edit']),
  size: z.enum(ALLOWED_SIZES),
  quality: z.enum(['auto', 'low', 'medium', 'high']),
  outputFormat: z.enum(['png', 'jpeg', 'webp']),
  outputCompression: z.number().int().min(0).max(100).nullable(),
  imageCount: z.number().int().min(1),
}).strict();

export const plannerDraftSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  steps: z.array(planStepSchema).min(1).max(8),
  generation: generationSchema,
  assumptions: z.array(z.string().trim().min(1).max(500)).max(12),
  warnings: z.array(z.string().trim().min(1).max(500)).max(12),
}).strict();

export const plannerJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'steps', 'generation', 'assumptions', 'warnings'],
  properties: {
    summary: { type: 'string', minLength: 1, maxLength: 1000 },
    steps: {
      type: 'array', minItems: 1, maxItems: 8,
      items: {
        type: 'object', additionalProperties: false, required: ['title', 'operation'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          operation: { type: 'string', enum: ['generate', 'edit'] },
        },
      },
    },
    generation: {
      type: 'object', additionalProperties: false,
      required: ['exactPrompt', 'action', 'size', 'quality', 'outputFormat', 'outputCompression', 'imageCount'],
      properties: {
        exactPrompt: { type: 'string', minLength: 1, maxLength: 16000 },
        action: { type: 'string', enum: ['generate', 'edit'] },
        size: { type: 'string', enum: [...ALLOWED_SIZES] },
        quality: { type: 'string', enum: ['auto', 'low', 'medium', 'high'] },
        outputFormat: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
        outputCompression: { anyOf: [{ type: 'integer', minimum: 0, maximum: 100 }, { type: 'null' }] },
        imageCount: { type: 'integer', minimum: 1 },
      },
    },
    assumptions: { type: 'array', maxItems: 12, items: { type: 'string', minLength: 1, maxLength: 500 } },
    warnings: { type: 'array', maxItems: 12, items: { type: 'string', minLength: 1, maxLength: 500 } },
  },
} as const;

export function validateAndConstrainDraft(
  input: unknown,
  preferences: PlanPreferences,
  assets: PlanInputView[],
  config: GatewayConfig,
): PlannerDraft {
  const parsed = plannerDraftSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(502, 'invalid_planner_output', 'Planner 返回了不符合策略的计划');
  }

  const draft = parsed.data;
  const generation = {
    ...draft.generation,
    ...(preferences.size ? { size: preferences.size } : {}),
    ...(preferences.quality ? { quality: preferences.quality } : {}),
    ...(preferences.outputFormat ? { outputFormat: preferences.outputFormat } : {}),
    ...(preferences.outputCompression !== undefined ? { outputCompression: preferences.outputCompression } : {}),
    ...(preferences.imageCount !== undefined ? { imageCount: preferences.imageCount } : {}),
  };

  if (!ALLOWED_SIZES.includes(generation.size as (typeof ALLOWED_SIZES)[number])) {
    throw new AppError(400, 'invalid_size', '不支持的图片尺寸');
  }
  if (generation.imageCount < 1 || generation.imageCount > config.maxOutputImages) {
    throw new AppError(400, 'invalid_image_count', `输出图片数量必须为 1-${config.maxOutputImages}`);
  }
  if (generation.outputFormat === 'png') generation.outputCompression = null;
  if (generation.outputFormat !== 'png' && generation.outputCompression === null) {
    generation.outputCompression = 90;
  }

  const hasEditableInput = assets.some((asset) => asset.role === 'reference' || asset.role === 'mask_target');
  const hasMask = assets.some((asset) => asset.role === 'mask');
  const hasMaskTarget = assets.some((asset) => asset.role === 'mask_target');
  if (hasMask !== hasMaskTarget) {
    throw new AppError(400, 'invalid_mask_inputs', 'mask 与 mask_target 必须同时提供');
  }
  if (generation.action === 'edit' && !hasEditableInput) {
    throw new AppError(400, 'missing_edit_input', '编辑计划必须包含参考图或遮罩目标图');
  }
  if (generation.action === 'generate' && hasMask) {
    throw new AppError(400, 'invalid_generate_input', '遮罩输入只能用于编辑计划');
  }
  if (hasMask && hasMaskTarget) {
    const mask = assets.find((asset) => asset.role === 'mask')!;
    const target = assets.find((asset) => asset.role === 'mask_target')!;
    if (mask.width !== target.width || mask.height !== target.height) {
      throw new AppError(400, 'mask_size_mismatch', 'mask 与 mask_target 尺寸必须一致');
    }
  }
  if (draft.steps.some((step) => step.operation !== generation.action)) {
    throw new AppError(502, 'inconsistent_planner_output', 'Planner 步骤与最终操作不一致');
  }

  return { ...draft, generation } as PlannerDraft;
}
