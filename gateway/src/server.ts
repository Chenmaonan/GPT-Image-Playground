import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AssetStore } from './assets.js';
import { loadConfig, type GatewayConfig } from './config.js';
import { GatewayDatabase } from './db.js';
import { AppError } from './errors.js';
import { ExecutionEvents } from './events.js';
import { DeterministicImagesExecutor, type ImageExecutor } from './executor.js';
import { ALLOWED_SIZES, POLICY_VERSION, validateAndConstrainDraft } from './policy.js';
import { ResponsesPlanner, type Planner } from './planner.js';
import {
  getOrCreateSession,
  requireCsrf,
  requireSameOrigin,
  SlidingWindowRateLimiter,
  type SessionContext,
} from './security.js';
import type { PlanInputView, PlanPreferences, RestrictedAgentPlanSnapshot, StoredAsset } from './types.js';
import { ExecutionWorker } from './worker.js';

const fieldSchema = z.object({
  request: z.string().trim().min(1).max(16_000),
  size: z.enum(ALLOWED_SIZES).optional(),
  quality: z.enum(['auto', 'low', 'medium', 'high']).optional(),
  outputFormat: z.enum(['png', 'jpeg', 'webp']).optional(),
  outputCompression: z.coerce.number().int().min(0).max(100).optional(),
  imageCount: z.coerce.number().int().min(1).optional(),
}).strict();

export interface CreateAppOptions {
  config?: GatewayConfig;
  planner?: Planner;
  executor?: ImageExecutor;
}

function sessionForMutation(request: FastifyRequest, reply: Parameters<typeof getOrCreateSession>[1], config: GatewayConfig): SessionContext {
  requireSameOrigin(request, config);
  const session = getOrCreateSession(request, reply, config);
  requireCsrf(request, session);
  return session;
}

function parseIfMatch(header: string | string[] | undefined): number {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) throw new AppError(428, 'if_match_required', '确认执行必须携带 If-Match 计划版本');
  const match = /^(?:W\/)?"?(\d+)"?$/.exec(value.trim());
  if (!match) throw new AppError(400, 'invalid_if_match', 'If-Match 格式无效');
  return Number(match[1]);
}

function ensureEmptyBody(request: FastifyRequest): void {
  const length = Number(request.headers['content-length'] ?? 0);
  if (length > 0 || request.body !== undefined) {
    throw new AppError(400, 'body_not_allowed', '此接口不接受请求体');
  }
}

function assetToPlanInput(asset: StoredAsset): PlanInputView {
  if (asset.role === 'generated') throw new Error('生成资源不能作为计划输入');
  return {
    assetId: asset.id,
    role: asset.role,
    sha256: asset.sha256,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
  };
}

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    logger: config.logLevel === 'silent' ? false : {
      level: config.logLevel,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.x-csrf-token',
        'res.headers.set-cookie',
      ],
    },
    bodyLimit: config.maxUploadBytes,
    trustProxy: true,
    requestTimeout: Math.max(config.plannerTimeoutMs, config.executorTimeoutMs) + 10_000,
  });
  await app.register(multipart, {
    limits: {
      fileSize: config.maxFileBytes,
      files: config.maxReferenceImages + 2,
      fields: 6,
      parts: config.maxReferenceImages + 8,
    },
  });

  const db = new GatewayDatabase(config);
  const assetStore = new AssetStore(config);
  await assetStore.initialize();
  const planner = options.planner ?? new ResponsesPlanner(config);
  const executor = options.executor ?? new DeterministicImagesExecutor(config);
  const events = new ExecutionEvents();
  const worker = new ExecutionWorker(db, assetStore, executor, events);
  const rateLimiter = new SlidingWindowRateLimiter();
  const recovered = db.recoverInterruptedExecutions();
  if (recovered > 0) app.log.warn({ recovered }, '已将重启时的 executing 任务标记为 failed_unknown');
  worker.start();

  const cleanupExpiredAssets = async () => {
    const expired = db.listExpiredAssets();
    for (const asset of expired) {
      await assetStore.remove(asset);
      db.deleteAssetRecord(asset.id);
    }
  };
  await cleanupExpiredAssets();
  const cleanupTimer = setInterval(() => void cleanupExpiredAssets().catch((error) => {
    app.log.warn({ err: error }, '清理过期资源失败');
  }), 5 * 60_000);
  cleanupTimer.unref();

  app.addHook('onClose', async () => {
    clearInterval(cleanupTimer);
    await worker.shutdown();
    db.close();
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send({ error: { code: error.code, message: error.message, details: error.details } });
      return;
    }
    const multipartCode = (error as { code?: string }).code;
    if (multipartCode?.startsWith('FST_')) {
      void reply.status(multipartCode.includes('TOO_LARGE') ? 413 : 400).send({
        error: { code: 'invalid_multipart', message: '上传数据不符合限制' },
      });
      return;
    }
    app.log.error({ err: error }, 'Gateway 未处理异常');
    void reply.status(500).send({ error: { code: 'internal_error', message: 'Gateway 内部错误' } });
  });

  app.get('/healthz', async () => {
    db.raw.prepare('SELECT 1').get();
    return { status: 'ok' };
  });

  app.get('/v1/capabilities', async (request, reply) => {
    const session = getOrCreateSession(request, reply, config);
    reply.header('cache-control', 'no-store');
    return {
      data: {
        enabled: true,
        policyVersion: POLICY_VERSION,
        csrfToken: session.csrfToken,
        limits: {
          planTtlSeconds: config.planTtlSeconds,
          assetTtlSeconds: config.assetTtlSeconds,
          maxReferenceImages: config.maxReferenceImages,
          maxFileBytes: config.maxFileBytes,
          maxUploadBytes: config.maxUploadBytes,
          maxImagePixels: config.maxImagePixels,
          maxOutputImages: config.maxOutputImages,
          maxQueue: config.maxQueue,
          maxConcurrency: config.maxConcurrency,
          planRatePerMinute: config.planRatePerMinute,
          executeRatePerMinute: config.executeRatePerMinute,
          imagesRatePerHour: config.imagesRatePerHour,
        },
        parameters: {
          sizes: ALLOWED_SIZES,
          qualities: ['auto', 'low', 'medium', 'high'],
          outputFormats: ['png', 'jpeg', 'webp'],
        },
      },
    };
  });

  app.post('/v1/plans', async (request, reply) => {
    const session = sessionForMutation(request, reply, config);
    rateLimiter.consume(`plan:${session.id}`, config.planRatePerMinute, 60_000);
    if (!request.isMultipart()) throw new AppError(415, 'multipart_required', '创建计划必须使用 multipart/form-data');

    const rawFields: Record<string, string> = {};
    const uploads: Array<StoredAsset & { uploadedByteSize: number }> = [];
    const roleCounts = new Map<string, number>();
    let totalUploadedBytes = 0;
    try {
      for await (const part of request.parts()) {
        if (part.type === 'field') {
          if (!(part.fieldname in fieldSchema.shape)) throw new AppError(400, 'unknown_field', `不允许字段 ${part.fieldname}`);
          if (rawFields[part.fieldname] !== undefined) throw new AppError(400, 'duplicate_field', `字段 ${part.fieldname} 重复`);
          if (typeof part.value !== 'string') throw new AppError(400, 'invalid_field', `字段 ${part.fieldname} 必须是文本`);
          rawFields[part.fieldname] = part.value;
          continue;
        }
        if (!['reference', 'mask_target', 'mask'].includes(part.fieldname)) {
          part.file.resume();
          throw new AppError(400, 'unknown_file_field', `不允许文件字段 ${part.fieldname}`);
        }
        const role = part.fieldname as 'reference' | 'mask_target' | 'mask';
        const count = (roleCounts.get(role) ?? 0) + 1;
        roleCounts.set(role, count);
        if (role === 'reference' && count > config.maxReferenceImages) throw new AppError(400, 'too_many_references', '参考图数量超过限制');
        if (role !== 'reference' && count > 1) throw new AppError(400, 'duplicate_mask_input', `${role} 只能上传一张`);
        const stored = await assetStore.storeUpload(part, session.id, role);
        uploads.push(stored);
        totalUploadedBytes += Math.max(stored.uploadedByteSize, stored.byteSize);
        if (totalUploadedBytes > config.maxUploadBytes) throw new AppError(413, 'upload_too_large', '上传总大小超过限制');
      }

      const parsedFields = fieldSchema.safeParse(rawFields);
      if (!parsedFields.success) throw new AppError(400, 'invalid_plan_request', '计划请求字段无效');
      if (parsedFields.data.imageCount && parsedFields.data.imageCount > config.maxOutputImages) {
        throw new AppError(400, 'invalid_image_count', `输出图片数量必须为 1-${config.maxOutputImages}`);
      }
      const preferences: PlanPreferences = {
        size: parsedFields.data.size,
        quality: parsedFields.data.quality,
        outputFormat: parsedFields.data.outputFormat,
        outputCompression: parsedFields.data.outputCompression,
        imageCount: parsedFields.data.imageCount,
      };
      const inputs = uploads.map(assetToPlanInput);
      const draft = validateAndConstrainDraft(
        await planner.createDraft({ request: parsedFields.data.request, preferences, assets: uploads }),
        preferences,
        inputs,
        config,
      );
      const id = randomUUID();
      const plan: RestrictedAgentPlanSnapshot = {
        id,
        version: 1,
        status: 'awaiting_confirmation',
        expiresAt: new Date(Date.now() + config.planTtlSeconds * 1000).toISOString(),
        originalRequest: parsedFields.data.request,
        summary: draft.summary,
        steps: draft.steps,
        generation: draft.generation,
        inputs,
        assumptions: draft.assumptions,
        warnings: draft.warnings,
        policyVersion: POLICY_VERSION,
      };
      db.insertPlan(plan, session.id, uploads);
      reply.header('etag', `"${plan.version}"`).header('cache-control', 'no-store').status(201);
      return { data: plan };
    } catch (error) {
      await Promise.all(uploads.map((asset) => assetStore.remove(asset)));
      throw error;
    }
  });

  app.get<{ Params: { id: string } }>('/v1/plans/:id', async (request, reply) => {
    const session = getOrCreateSession(request, reply, config);
    const plan = db.getPlan(request.params.id, session.id);
    reply.header('etag', `"${plan.version}"`).header('cache-control', 'no-store');
    return { data: plan };
  });

  app.post<{ Params: { id: string } }>('/v1/plans/:id/execute', async (request, reply) => {
    const session = sessionForMutation(request, reply, config);
    ensureEmptyBody(request);
    const expectedVersion = parseIfMatch(request.headers['if-match']);
    const existing = db.findExecutionByPlan(request.params.id, session.id);
    if (existing) {
      reply.header('cache-control', 'no-store');
      return { data: existing };
    }
    const releaseExecuteRate = rateLimiter.consume(`execute:${session.id}`, config.executeRatePerMinute, 60_000);
    let releaseImageRate: (() => void) | undefined;
    let result: ReturnType<GatewayDatabase['createExecution']>;
    try {
      const plan = db.getPlan(request.params.id, session.id);
      releaseImageRate = rateLimiter.consume(`images:${session.id}`, config.imagesRatePerHour, 3_600_000, plan.generation.imageCount);
      result = db.createExecution(request.params.id, session.id, expectedVersion);
      if (!result.created) {
        releaseExecuteRate();
        releaseImageRate();
      }
    } catch (error) {
      releaseExecuteRate();
      releaseImageRate?.();
      throw error;
    }
    if (result.created) {
      worker.notify();
      reply.status(202);
    }
    reply.header('cache-control', 'no-store');
    return { data: result.execution };
  });

  app.get<{ Params: { id: string } }>('/v1/executions/:id', async (request, reply) => {
    const session = getOrCreateSession(request, reply, config);
    reply.header('cache-control', 'no-store');
    return { data: db.getExecution(request.params.id, session.id) };
  });

  app.post<{ Params: { id: string } }>('/v1/executions/:id/cancel', async (request, reply) => {
    const session = sessionForMutation(request, reply, config);
    ensureEmptyBody(request);
    const execution = db.requestCancellation(request.params.id, session.id);
    if (execution.status === 'executing') worker.abort(execution.id);
    events.emitState(execution);
    reply.header('cache-control', 'no-store');
    return { data: execution };
  });

  app.get<{ Params: { id: string } }>('/v1/assets/:id', async (request, reply) => {
    const session = getOrCreateSession(request, reply, config);
    const asset = db.getAsset(request.params.id, session.id);
    reply.header('content-type', asset.mimeType);
    reply.header('content-length', asset.byteSize);
    reply.header('cache-control', 'private, no-store');
    reply.header('x-content-type-options', 'nosniff');
    return reply.send(assetStore.createReadStream(asset));
  });

  app.get<{ Params: { id: string } }>('/v1/executions/:id/events', async (request, reply) => {
    const session = getOrCreateSession(request, reply, config);
    const current = db.getExecution(request.params.id, session.id);
    reply.hijack();
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-store',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    const writeEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    writeEvent(current.status === 'executing' ? 'execution.started' : `execution.${current.status}`, {
      executionId: current.id,
      planId: current.planId,
      status: current.status,
      updatedAt: current.updatedAt,
    });
    const unsubscribe = events.subscribe(current.id, writeEvent);
    const heartbeat = setInterval(() => reply.raw.write(': heartbeat\n\n'), 15_000);
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return app;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await createApp({ config });
  const shutdown = async () => {
    await app.close();
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  await app.listen({ host: config.host, port: config.port });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    // 配置错误时不启动任何监听，保持 fail closed。
    process.stderr.write(`受限 Agent Gateway 启动失败: ${error instanceof Error ? error.message : '未知错误'}\n`);
    process.exitCode = 1;
  });
}
