# 受限图片 Agent Gateway 设计

## 目标

为 GPT Image Playground 增加可信内网使用的受限 Agent。Agent 必须先生成可审查的执行计划，只有用户明确确认后才能调用图片接口。所有使用服务端额度的调用都必须经过服务端策略校验，浏览器不能指定模型、上游地址、工具或原始 API 请求体。

## 非目标

- 不建设公网多租户、计费或完整账号系统。
- 不提供浏览器、Shell、任意 HTTP、文件系统、邮件、发布或部署工具。
- 不支持多 Agent、动态工具注册、递归调用或自动重试。
- 不允许远程 URL 抓图或用户自定义 Provider。
- 不在首版实现横向扩容；Gateway 明确按单实例运行。

## 核心原则

1. Planner 与 Executor 分离。
2. Planner 无工具、无 API Key，只返回严格 schema 的计划。
3. 计划在服务端保存并绑定输入资源哈希，确认后不可篡改。
4. Executor 只执行服务端保存的计划快照，不接受客户端传入的模型、工具、Prompt 或参数。
5. 受限模式必须关闭现有 `/api-proxy` 直通路径。
6. Gateway 故障时 fail closed，不得回退到旧代理。

## 架构

```text
Browser
  ├─ Static UI / local history
  └─ /agent-api/v1/*
        ↓
     Agent Gateway
        ├─ Session / CSRF / rate limits
        ├─ Asset validation and hashing
        ├─ Tool-less Planner
        ├─ Policy validation
        ├─ SQLite plan and execution state
        └─ Deterministic Image Executor
              ↓
          Fixed upstream API
```

生产环境使用两个容器：现有 Nginx 前端容器和只暴露 Compose 内网端口的 Node.js Gateway。API Key、上游 URL 和模型配置只进入 Gateway 容器。

## Agent 能力边界

### 允许

- 理解自然语言图片需求。
- 分析用户明确上传的本地参考图。
- 规划文本生图、参考图编辑和受控遮罩编辑。
- 展示最终 Prompt、参数、步骤、假设和警告。
- 等待用户确认或返回修改。
- 执行一个已确认的图片生成步骤。
- 展示排队、执行、完成、失败和取消状态。
- 将成功结果写入现有 TaskRecord 和 IndexedDB。
- 基于历史结果创建新计划。

### 禁止

- 自动确认、自动执行或自动重试。
- 任意模型、Provider、Base URL、API Key、tools、tool_choice 或原始请求体。
- 远程 URL 抓图、任意网络请求、浏览器、Shell 和通用文件系统访问。
- 外部消息、邮件、发布、部署和其他副作用。
- 多 Agent、递归工具调用、无限循环和动态工具注册。
- 读取未由用户明确选择的历史内容。
- 对同一计划重复执行。

## 两阶段协议

### 创建计划

`POST /agent-api/v1/plans`

请求使用 `multipart/form-data`，包含原始需求、受控偏好和本地图片文件。客户端 schema 不包含 model、upstream、tools 或远程 URL。

Gateway 流程：

1. 校验会话、Origin、CSRF、请求速率和上传大小。
2. 流式落盘并校验图片魔数、格式、像素和数量。
3. 清理元数据，计算 SHA-256 并绑定计划。
4. 调用固定 Planner，且不提供任何工具。
5. 严格验证 Planner JSON，拒绝未知字段和越界值。
6. 保存不可变计划并返回待确认视图。

计划包含：`id`、`version`、`expiresAt`、原始需求、摘要、步骤、最终 Prompt、操作类型、尺寸、质量、格式、压缩率、数量、输入资源、假设、警告和策略版本。

修改需求会创建新计划或新版本，旧版本不能执行。

### 确认执行

`POST /agent-api/v1/plans/{planId}/execute`

请求体为空，通过版本或 ETag 防止确认过期视图。SQLite 事务原子执行 `awaiting_confirmation -> queued` 并创建唯一 execution。重复幂等请求返回同一 execution；并发重复确认不会产生第二次上游调用。

### 状态与事件

```text
GET  /agent-api/v1/capabilities
GET  /agent-api/v1/plans/{id}
GET  /agent-api/v1/executions/{id}
GET  /agent-api/v1/executions/{id}/events
POST /agent-api/v1/executions/{id}/cancel
GET  /agent-api/v1/assets/{id}
```

执行状态：

```text
awaiting_confirmation
  → queued
  → executing
  → completed | failed | cancelled | failed_unknown
```

SSE 只传状态、进度和资源标识，不直接传输大段 Base64。断线重连只恢复读取，不能触发第二次生成。上游请求状态不确定时标记 `failed_unknown`，禁止自动重发。

## 前端状态与历史兼容

未确认计划不是生成任务，不写入现有 `TaskRecord`。前端单独维护：

```ts
type AgentFlowPhase =
  | 'idle'
  | 'planning'
  | 'awaiting_confirmation'
  | 'confirming'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'expired'
```

确认成功后才创建现有 `running` 任务，并增加可选字段：

```ts
origin?: 'gallery' | 'restricted-agent'
agentPlanId?: string
agentExecutionId?: string
agentOriginalRequest?: string
agentPlanSnapshot?: RestrictedAgentPlan
```

任务的 `prompt` 和 `params` 保存实际确认的计划快照。旧任务不需要迁移；画廊、搜索、收藏、导出和下载继续使用现有结构。Agent 任务的失败重试必须重新规划并确认，不能调用现有普通重试路径。

## 安全策略

- HttpOnly、SameSite=Strict 会话绑定计划。
- 校验 Origin、Host 和 CSRF Header；默认不开放 CORS。
- 计划 ID 使用高熵随机值，并设置 15 分钟 TTL。
- 输入只接受上传文件，拒绝用户提供的远程 URL。
- 图片校验魔数、真实格式、像素、单文件和总大小，并清理元数据。
- 输入资源与计划绑定 SHA-256。
- Planner 输出视为不可信数据并执行严格 schema 校验。
- Gateway 固定上游、模型、接口模式、超时、参数枚举和调用次数。
- 审计不记录 Key、Authorization、Base64 或完整图片；长期记录 Prompt 哈希和长度。
- 默认限制：16 张参考图、128 MiB 上传、1 至 4 张输出、单计划一次调用、全局并发 2、队列 10。
- 默认速率：计划 5 次/分钟/会话、确认 2 次/分钟/会话、生成 20 张/小时/会话。

## 执行策略

首版 Planner 使用固定 Responses-compatible 模型且无 tools；Executor 使用固定 Images API 并按确认计划发起一次请求。首版不实现通用 Agent loop，也不支持客户端选择接口模式。未来若必须支持 Responses `image_generation`，只能新增服务端受控适配器。

## 数据存储

SQLite 表：

- `plans`：计划快照、状态、版本、策略版本和 TTL。
- `executions`：唯一 plan 关联、状态、上游请求标识和错误分类。
- `assets`：输入/输出资源元数据、哈希、路径和过期时间。
- `audit_events`：状态迁移和脱敏元数据。

图片存专用 volume，SQLite 只保存元数据和路径。单 Gateway 实例通过 SQLite 事务领取任务。重启时 queued 可恢复，executing 标记为 `failed_unknown`，不自动重发。

## 部署

- Nginx 精确反代 `/agent-api/` 到 `agent-gateway:3000`。
- Gateway 不映射宿主机端口，只通过 Compose 网络访问。
- Agent SSE 关闭 Nginx buffering；上传关闭 request buffering。
- 受限模式删除或拒绝 `/api-proxy/*`。
- Runtime Config 只公开 Agent 是否启用、同源入口和非秘密限制。
- 纯静态 Vercel、GitHub Pages 和 Cloudflare Pages 不能启用受限 Agent。
- Gateway 数据目录使用 named volume。

## 实现边界

Gateway 使用独立 Node.js/TypeScript package，建议依赖 `fastify`、`@fastify/multipart`、`better-sqlite3`、`sharp` 和 `vitest`，通过原生 `fetch` 调用上游。Gateway 镜像使用 Debian slim 以支持 amd64/arm64 原生依赖。

前端新增 API client、独立 Agent flow store 和计划卡组件；修改 InputBar、AgentMainWorkspace、任务恢复和 Agent 任务重试行为。部署侧修改 Compose、Nginx、Runtime Config、环境变量示例和发布工作流。

## 测试与验收

1. 创建计划不会调用图片接口或创建任务历史。
2. 客户端夹带 model、tools、upstream 和未知字段时拒绝。
3. 确认请求不携带 Prompt、参数、模型或 tools。
4. 同计划并发确认只产生一次上游调用。
5. 过期、跨会话、已执行和版本失效的计划均被拒绝。
6. 受限模式下 `/api-proxy/*` 不可达。
7. SSE 断线重连不重复执行。
8. Gateway 重启不自动重发状态不确定的上游请求。
9. 成功结果进入现有 IndexedDB 和共享历史。
10. 旧历史、画廊、模板、收藏、导出和下载不回归。
11. 日志、Runtime Config 和静态产物中不存在 API Key、Bearer 或图片 Base64。
12. 前端测试、Gateway 测试、生产构建和 Docker Compose 验证全部通过。

## 回滚

关闭 Agent 只禁用 `/agent-api`，不会自动重新开放 `/api-proxy`。新增 TaskRecord 字段均为可选字段，无 IndexedDB 迁移。回滚前端和 Gateway 镜像后，已有历史图片仍可查看；SQLite 数据卷保留。若旧代理曾暴露服务端 Key，必须轮换 Key。
