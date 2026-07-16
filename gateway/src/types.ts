export const PLAN_STATUSES = [
  'awaiting_confirmation',
  'queued',
  'executing',
  'completed',
  'failed',
  'cancelled',
  'failed_unknown',
  'expired',
] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const EXECUTION_STATUSES = [
  'queued',
  'executing',
  'completed',
  'failed',
  'cancelled',
  'failed_unknown',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export type AssetRole = 'reference' | 'mask_target' | 'mask' | 'generated';

export interface StoredAsset {
  id: string;
  planId: string | null;
  executionId: string | null;
  sessionId: string;
  direction: 'input' | 'output';
  role: AssetRole;
  mimeType: string;
  sha256: string;
  storagePath: string;
  byteSize: number;
  width: number;
  height: number;
  expiresAt: number;
  createdAt: number;
}

export interface PlanInputView {
  assetId: string;
  role: Exclude<AssetRole, 'generated'>;
  sha256: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface PlanStep {
  title: string;
  operation: 'generate' | 'edit';
}

export interface GenerationPlan {
  exactPrompt: string;
  action: 'generate' | 'edit';
  size: string;
  quality: 'auto' | 'low' | 'medium' | 'high';
  outputFormat: 'png' | 'jpeg' | 'webp';
  outputCompression: number | null;
  imageCount: number;
}

export interface RestrictedAgentPlanSnapshot {
  id: string;
  version: number;
  status: PlanStatus;
  expiresAt: string;
  originalRequest: string;
  summary: string;
  steps: PlanStep[];
  generation: GenerationPlan;
  inputs: PlanInputView[];
  assumptions: string[];
  warnings: string[];
  policyVersion: string;
}

export interface ExecutionView {
  id: string;
  planId: string;
  status: ExecutionStatus;
  cancelRequested: boolean;
  error: { code: string; message: string } | null;
  outputAssets: Array<{
    id: string;
    url: string;
    mimeType: string;
    sha256: string;
    width: number;
    height: number;
    byteSize: number;
  }>;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface PlannerDraft {
  summary: string;
  steps: PlanStep[];
  generation: GenerationPlan;
  assumptions: string[];
  warnings: string[];
}

export interface PlanPreferences {
  size?: string;
  quality?: GenerationPlan['quality'];
  outputFormat?: GenerationPlan['outputFormat'];
  outputCompression?: number;
  imageCount?: number;
}
