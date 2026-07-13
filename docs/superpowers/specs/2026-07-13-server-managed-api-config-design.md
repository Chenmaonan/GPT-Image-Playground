# 服务端统一 API 配置设计

## 目标

增加由服务器环境变量控制的统一 API 配置模式。开启后，应用内所有生成、编辑、重试和历史复用均使用服务端配置；客户端 Profiles、URL 参数、配置导入和持久化内容不能改变实际请求配置。

## 范围

- 首版支持 OpenAI 兼容的 Images API 与 Responses API。
- Docker/Nginx 提供官方服务端实现；其他平台可实现相同的 `/runtime-config.json` 与 `/api-proxy/` 协议。
- fal.ai 和自定义 Provider 在统一模式下不可用，关闭统一模式后保持原行为。
- 不新增登录、限流或完整 BFF；公网部署需要外部访问控制。

## 架构

### 公开运行时配置

浏览器启动前以 `cache: no-store` 加载 `/runtime-config.json`。公开内容仅包含：

- `enabled`
- 固定 Provider `openai`
- `model`
- `apiMode`
- `codexCli`
- `responseFormatB64Json`
- `timeoutSeconds`
- 同源代理路径

运行时配置不得包含 API Key、真实上游 URL 或 Authorization。

加载失败时进入不可用状态：允许查看本地历史，但禁止 API 提交，不回退到客户端配置。

### Effective Profile

`src/lib/serverApiConfig.ts` 维护运行时配置单例，并提供：

- `loadRuntimeConfig()`
- `initializeRuntimeConfig(raw)`
- `getRuntimeConfigState()`
- `isServerApiConfigEnabled()`
- `isServerApiConfigUsable()`
- `getServerManagedApiProfile()`
- `getEffectiveApiProfile(settings)`
- `getEffectiveSettings(settings)`
- `sanitizeSettingsPatchForServerMode(patch)`

服务器模式返回固定 ID `server-managed-openai` 的临时 Profile。用户原 Profiles 保留在 Zustand 持久化数据中，但处于休眠状态，不参与请求。

### 请求边界

服务器模式下：

- `callImageApi()` 强制分发到 OpenAI 兼容实现。
- 请求 URL 固定为同源 `/api-proxy/`。
- 浏览器不发送 Provider Authorization。
- model、apiMode、Codex CLI 和超时来自运行时配置。
- 运行时配置不可用时直接报错。

Nginx 固定上游 URL、覆盖 Authorization，并按 API 模式限制可访问路径。Nginx 不解析请求体，因此手工构造的 HTTP 请求仍可能修改请求体中的模型；这不属于本次应用内配置锁定范围。

### Store 与导入入口

- `setSettings()` 在服务器模式下只接受习惯配置字段，忽略所有 API 字段和 Profiles。
- URL API 参数会从地址栏清除，但不会写入 Store。
- ZIP 配置导入只应用允许的习惯配置，API Profiles 被忽略。
- 历史任务复用只恢复提示词、图片和生成参数。
- 重试始终使用当前服务器配置。
- 启动时不恢复旧 fal.ai 或自定义异步任务；将其标记为明确错误，避免旧配置绕过。
- 服务端配置及 API Key 不进入导出数据。

### UI

API 配置页在服务器模式下显示只读卡片，展示 Provider、模型和 API 模式，隐藏 Profile 管理、URL、Key、导入、复制和自定义 Provider 操作。

习惯设置中的“临时复用任务 API 配置”隐藏。历史操作文案改为“复用输入与参数”。运行时配置错误时提交按钮禁用并显示部署配置错误。

## Docker 环境变量

```text
SERVER_API_CONFIG_ENABLED=false
SERVER_API_UPSTREAM_URL=https://api.openai.com/v1
SERVER_API_KEY=...
SERVER_API_MODEL=gpt-image-2
SERVER_API_MODE=images
SERVER_API_CODEX_CLI=false
SERVER_API_RESPONSE_FORMAT_B64_JSON=false
SERVER_API_TIMEOUT_SECONDS=600
```

开启统一模式时，容器启动脚本校验 URL、Key、模型、模式、布尔值与超时；配置非法时直接退出。新模式强制启用并锁定代理，忽略旧代理开关组合。关闭时完整保留现有 `DEFAULT_API_URL`、`API_PROXY_URL`、`ENABLE_API_PROXY`、`LOCK_API_PROXY` 和旧 `API_URL` 迁移行为。

## 缓存与安全

- `/runtime-config.json` 使用 `Cache-Control: no-store`。
- Service Worker 不缓存该路径。
- API Key 只存在于容器环境与生成后的 Nginx 配置中。
- 客户端伪造 Authorization 会被服务端覆盖。
- 代理仍等同于可消耗服务器额度的入口，公网部署必须使用认证、VPN、IP 白名单或外部限流。

## 验收标准

1. 开关关闭时现有 95 项测试行为兼容。
2. 开关开启时，localStorage、URL、ZIP、历史 Profile 和 fal/custom Provider 都不能改变有效请求。
3. 浏览器请求只访问同源代理且不携带 Provider Key。
4. 配置缺失或加载失败时禁止提交且不回退。
5. 同一镜像更换环境变量后，刷新即可读取新配置，不受 hash JS 或 Service Worker 缓存影响。
6. 哨兵 API Key 不出现在前端静态产物、运行时配置或导出数据中。
