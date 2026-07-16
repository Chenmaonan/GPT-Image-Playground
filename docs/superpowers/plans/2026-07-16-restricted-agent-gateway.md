# 受限 Agent Gateway 实施计划

## 目标

实现 `docs/superpowers/specs/2026-07-16-restricted-agent-gateway-design.md` 中确认的两阶段受限 Agent：浏览器先创建计划，用户确认后由独立 Gateway 执行冻结计划；受限模式下关闭通用 `/api-proxy` 旁路。

## 工作流与文件边界

### 任务 1：Gateway 服务

范围：`gateway/**`

- 建立独立 Node.js/TypeScript package 和 Dockerfile。
- 实现 fail-closed 环境配置、会话、CSRF、速率与并发限制。
- 实现 multipart 图片上传、格式校验、哈希和资源存储。
- 实现无工具 Planner、严格计划 schema 和确定性 Images Executor。
- 实现 SQLite 计划、执行、资源和审计状态。
- 实现 capabilities、plans、execute、execution status/events/cancel 和 assets API。
- 使用 fake upstream 覆盖计划不执行、确认一次性、篡改拒绝和重启恢复测试。

### 任务 2：前端两阶段流程

范围：`src/**`

- 定义计划、执行和 Agent 任务元数据类型。
- 新增同源 Gateway API client 和独立 Agent flow store。
- Agent 输入按钮改为“生成计划”，不再浏览器直连上游。
- 新增计划卡、参数展示、确认、返回修改和执行时间线。
- 确认后才创建标准 TaskRecord，并把成功结果写入 IndexedDB。
- Agent 任务禁止普通重试；刷新后按 executionId 恢复。
- 保持画廊、模板、旧任务和普通生成流程兼容。

### 任务 3：部署与运行时配置

范围：`deploy/**`、`docker-compose.yml`、`.env.example`、`public/runtime-config.json`、Docker 发布工作流

- 在 Compose 中增加仅内网暴露的 Gateway 和数据卷。
- Nginx 新增 `/agent-api/` 反代、SSE 和上传配置。
- 增加受限模式开关；启用时删除 `/api-proxy` block。
- Runtime Config 公开非秘密 Agent capability。
- Gateway 镜像支持 amd64/arm64 构建和健康检查。
- 所有配置非法时 fail closed。

### 任务 4：主代理整合

- 对齐前后端 DTO、状态码、路径和事件协议。
- 处理 Store 任务创建、完成、失败和恢复边界。
- 更新 README、配置说明和回滚说明。
- 审查日志、静态产物和运行时配置是否泄露秘密。
- 修复子任务之间的接口冲突和回归。

## 验证

1. `npm test`
2. `npm run build`
3. Gateway 单元与集成测试
4. Gateway TypeScript 构建
5. 前端与 Gateway Docker 镜像构建
6. Compose 启动、健康检查和 mock upstream 端到端验证
7. 受限模式 `/api-proxy/*` 不可达，`/agent-api/v1/capabilities` 可达
8. 工作区和静态产物秘密扫描
9. 删除测试生成的临时文件、容器和镜像
10. Git diff、状态和需求逐项审计

## 提交策略

只提交本任务相关文件，不加入已有未跟踪目录。提交信息使用中文 Conventional Commits 类型。
