import { readFile } from 'node:fs/promises';
import type { GatewayConfig } from './config.js';
import { AppError } from './errors.js';
import { plannerJsonSchema } from './policy.js';
import type { PlanPreferences, PlannerDraft, StoredAsset } from './types.js';

export interface PlannerInput {
  request: string;
  preferences: PlanPreferences;
  assets: StoredAsset[];
}

export interface Planner {
  createDraft(input: PlannerInput): Promise<unknown>;
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.output_text === 'string') return root.output_text;
  if (!Array.isArray(root.output)) return null;
  for (const item of root.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string') return text;
      const json = (part as Record<string, unknown>).json;
      if (json !== undefined) return JSON.stringify(json);
    }
  }
  return null;
}

export class ResponsesPlanner implements Planner {
  constructor(private readonly config: GatewayConfig) {}

  async createDraft(input: PlannerInput): Promise<unknown> {
    const content: Array<Record<string, unknown>> = [{
      type: 'input_text',
      text: [
        '你是一个受限图片生成计划器。只返回符合 schema 的计划，不执行任何工具。',
        '精确描述最终图像，并把用户未明确说明但执行所必需的判断列入 assumptions。',
        '有参考图且用户要求修改时 action=edit；纯参考风格也可 edit。每个 step 的 operation 必须等于 generation.action。',
        `用户需求：${input.request}`,
        `用户偏好：${JSON.stringify(input.preferences)}`,
      ].join('\n'),
    }];

    for (const asset of input.assets) {
      const bytes = await readFile(asset.storagePath);
      content.push({
        type: 'input_image',
        image_url: `data:${asset.mimeType};base64,${bytes.toString('base64')}`,
        detail: 'high',
      });
      content.push({ type: 'input_text', text: `上一张图片的受控角色：${asset.role}；SHA-256：${asset.sha256}` });
    }

    const signal = AbortSignal.timeout(this.config.plannerTimeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.config.upstreamBaseUrl}/responses`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.plannerModel,
          input: [{ role: 'user', content }],
          text: {
            format: {
              type: 'json_schema',
              name: 'restricted_image_plan',
              strict: true,
              schema: plannerJsonSchema,
            },
          },
        }),
        redirect: 'error',
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw new AppError(504, 'planner_timeout', 'Planner 请求超时');
      throw new AppError(502, 'planner_unavailable', 'Planner 无法连接');
    }
    if (!response.ok) {
      throw new AppError(502, 'planner_upstream_error', `Planner 上游返回 HTTP ${response.status}`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AppError(502, 'invalid_planner_response', 'Planner 返回了无效 JSON');
    }
    const outputText = extractOutputText(payload);
    if (!outputText) throw new AppError(502, 'missing_planner_output', 'Planner 未返回结构化计划');
    try {
      return JSON.parse(outputText) as PlannerDraft;
    } catch {
      throw new AppError(502, 'invalid_planner_output', 'Planner 计划不是有效 JSON');
    }
  }
}
