<div align="center">

# 🎨 GPT Image Playground

[![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**基于 OpenAI gpt-image-2 API 的图片生成与编辑工具**

提供简洁精美的 Web UI，支持 OpenAI / OpenAI 兼容接口、fal.ai 与可导入的自定义 HTTP 服务商。<br>
支持文本生图、参考图与遮罩编辑，数据纯本地化存储，带来流畅的历史记录与参数管理体验。

</div>

<br>

> 💡 **提示**：若需调用非 HTTPS 的内网或本地 HTTP API，请自行部署到允许该访问策略的环境。

---

## 📸 界面预览

<details>
<summary><b>点击展开截图展示</b></summary>
<br>

<div align="center">
  <b>桌面端主界面</b><br>
  <img src="docs/images/example_pc_1.png" alt="桌面端主界面" />
</div>

<br>

<div align="center">
  <b>任务详情与实际参数</b><br>
  <img src="docs/images/example_pc_2.png" alt="任务详情与实际参数" />
</div>

<br>

<div align="center">
  <b>桌面端批量选择</b><br>
  <img src="docs/images/example_pc_3.png" alt="桌面端批量选择" />
</div>

<br>

<div align="center">
  <b>移动端主界面</b><br>
  <img src="docs/images/example_mb_1.jpg" alt="移动端主界面" width="420" />
</div>

<br>

<div align="center">
  <b>移动端侧滑多选</b><br>
  <img src="docs/images/example_mb_2.jpg" alt="移动端侧滑多选" width="420" />
</div>

</details>

---

## ✨ 核心特性

### 🎨 强大的图像生成与编辑
- **双模接口支持**：自由切换使用常规 `Images API` (`/v1/images`) 或 `Responses API` (`/v1/responses`)。
- **参考图与遮罩**：支持上传最多 16 张参考图（支持剪贴板和拖拽）。内置可视化遮罩编辑器，自动预处理以符合官方分辨率限制。
- **批量与迭代**：支持单次多图生成；一键将满意结果转为参考图，无缝开启下一轮修改。

### 🤖 可确认的受限 Agent
- **两阶段执行**：Agent 先输出最终 Prompt、参数、参考图和执行步骤，只有用户明确确认后才生成图片。
- **服务端权限边界**：Planner 不持有工具，Executor 只执行服务端冻结计划；浏览器不能指定模型、上游地址、工具或原始请求体。
- **内网安全控制**：提供不可重复执行的计划、输入哈希、会话与 CSRF 校验、额度和并发限制、SQLite 审计及断线恢复。

### ⚙️ 精细化参数追踪
- **智能尺寸控制**：提供 1K/2K/4K 快速预设，自定义宽高时会自动规整至模型安全范围（16 的倍数、总像素校验等）。
- **实际参数对比**：自动提取 API 响应中真实生效的尺寸、质量、耗时以及**模型改写后的提示词**，与你的请求参数高亮对比。支持定制化的参数列表横向平滑滚动体验。

### 📁 高效历史管理 (纯本地)
- **瀑布流与画廊**：历史任务自动保存，支持按状态过滤、全屏大图预览与快捷下载。
- **快捷批量操作**：桌面端支持鼠标拖拽框选、Ctrl/⌘ 连选，移动端支持顺滑侧滑多选；轻松实现批量收藏与清理。
- **极致性能与隐私**：所有记录与图片均存放在浏览器 IndexedDB 中（采用 SHA-256 去重压缩），不经过任何第三方服务器。支持一键打包导出 ZIP 备份。

### 🔌 多配置与服务商增强
- **多配置管理**：支持创建并保存多个 API 配置（包含服务商、API Key、模型等），按需快速切换；支持一键复制当前配置到列表底部，并通过拖拽对配置列表与服务商列表进行自定义排序。
- **多服务商接入**：内置 OpenAI 兼容接口（含 `Images API` 和 `Responses API`）、fal.ai（支持队列），并支持通过 JSON 导入自定义 HTTP 服务商配置（兼容同步/异步任务）。
- **API 代理**：OpenAI 兼容接口与 fal.ai 均可配置自定义代理。其中 OpenAI 兼容接口可开启同源 `/api-proxy/` 代理，交由 Docker 或本地开发环境转发至真实 API，绕开浏览器 CORS 限制。
- **Codex CLI 兼容模式**：对上游为 Codex CLI 的 API，开启后应用 Codex CLI 实际支持的参数，并将多图生成拆分为并发单图。
- **提示词防改写**：Responses API 会始终在请求文本前加入强制指令防止提示词被改写；开启 Codex CLI 模式后，Images API 也会获得同等保护。
- **智能诊断提示**：当检测到接口异常改写行为或缺少常规参数时，自动提示开启相应的兼容模式。
- **习惯配置**：支持设置提交后清空输入、重启后保留历史输入、临时复用历史任务 API 配置等。

---

## 🚀 部署与使用

支持多种部署与开发方式。无论使用哪种方式，你都可以预设默认的 API 节点。

<details>
<summary><strong>▲ 方式一：Vercel 一键部署 (推荐)</strong></summary>

将本仓库导入 Vercel 后，Vercel 会自动执行构建并部署静态文件。

**配置默认 API URL**：在 Vercel 项目的 **Settings → Environment Variables** 中添加 `VITE_DEFAULT_API_URL`（如 `https://api.openai.com/v1`），然后重新部署即可生效。

**绑定自定义域名 (国内直连)**：Vercel 默认分配的 `.vercel.app` 域名在国内通常无法直接访问。如果你希望在国内直连访问，请在 Vercel 项目的 **Settings → Domains** 中绑定你自己的域名。

**配置自动更新**：

本项目已在 `vercel.json` 中关闭了默认的自动部署。若需在推送代码或发布版本后自动更新 Vercel 部署：

1. 在 Vercel 项目设置 **Settings -> Git** 的 **Deploy Hooks** 中创建一个名为 `Release` 的 Hook（Branch 填 `main`）并复制生成的 URL。
2. 在你 Fork 的 GitHub 仓库设置 **Settings -> Secrets and variables -> Actions** 中，新建 Secret `VERCEL_DEPLOY_HOOK`，填入刚才的 URL。

此后，每次触发对应 GitHub Actions 工作流，都会自动触发 Vercel 构建部署最新版。

</details>

<details>
<summary><strong>☁️ 方式二：Cloudflare Workers 部署</strong></summary>

项目已内置 Wrangler 配置，可将 Vite 构建产物作为 Cloudflare Workers 静态资源部署。

**1. 登录 Cloudflare**

```bash
npx wrangler login
```

**2. 部署到 Workers**

```bash
npm run deploy:cf
```

部署脚本会先执行 `npm run build`，再通过 `wrangler deploy` 上传 `dist/` 目录。

**配置默认 API URL**：Cloudflare Workers 的环境变量不会自动改写已经构建好的静态文件。若需预设默认 API 地址，请在构建前设置 `VITE_DEFAULT_API_URL` 后再部署。

```bash
VITE_DEFAULT_API_URL=https://api.openai.com/v1 npm run deploy:cf
```

PowerShell 示例：

```powershell
$env:VITE_DEFAULT_API_URL="https://api.openai.com/v1"; npm run deploy:cf
```

</details>

<details>
<summary><strong>🐳 方式三：Docker 部署</strong></summary>

Docker 部署支持三种互斥运行方式：兼容模式、服务端统一配置，以及必须先确认计划的受限 Agent 模式。你可以使用本仓库工作流发布的镜像，或在本地构建镜像。

**受限 Agent 模式（可信内网推荐）：**

受限模式使用独立 `agent-gateway` 容器。Planner 只生成结构化计划，用户确认后 Executor 才调用固定 Images API。启用后 Nginx 会强制移除通用 `/api-proxy`，避免浏览器绕过确认流程。

启用时至少配置：

```env
RESTRICTED_AGENT_ENABLED=true
AGENT_PUBLIC_ORIGIN=https://你的站点域名
AGENT_SESSION_SECRET=至少32字符的随机字符串
AGENT_UPSTREAM_BASE_URL=https://api.openai.com/v1
AGENT_API_KEY=sk-your-server-key
AGENT_PLANNER_MODEL=你的规划模型
AGENT_IMAGE_MODEL=你的图片模型
```

关键限制均可通过 `AGENT_*` 环境变量调整，默认包括：计划 15 分钟过期、最多 16 张参考图、128 MiB 上传、每次 1–4 张输出、全局并发 2、队列 10。完整变量和默认值见 [.env.example](.env.example)。

Gateway 只在 Compose 内网暴露 `3000`，图片和 SQLite 数据保存在 `agent-gateway-data` volume 中。受限模式不适用于纯静态托管，也不应与 `SERVER_API_CONFIG_ENABLED=true` 同时开启。Gateway 不健康时 Agent 会失败关闭，不会回退到旧代理。

受限模式使用服务端固定 Images API 执行器，上游必须支持 `b64_json` 图片结果；不接受远程结果 URL，以避免 Gateway 代替用户抓取外部资源。

**兼容模式变量（`SERVER_API_CONFIG_ENABLED=false`，默认）：**

- `DEFAULT_API_URL`：设置页面上默认显示的 API 地址，默认回退到 `API_URL`，再回退到 `https://api.openai.com/v1`。
- `API_PROXY_URL`：内置代理实际转发到的目标 API 地址，默认回退规则同上。
- `ENABLE_API_PROXY`：`true` 时开启容器内 Nginx 同源代理；默认 `false`。浏览器 Authorization 会原样转发给上游。
- `LOCK_API_PROXY`：在 `ENABLE_API_PROXY=true` 时设为 `true`，会锁定前端代理开关；默认 `false`。
- `API_URL`：旧版兼容变量，同时作为 `DEFAULT_API_URL` 和 `API_PROXY_URL` 的兜底值；建议逐步迁移到拆分后的变量。
- `HOST` / `PORT`：容器内 Nginx 监听地址和端口，默认 `0.0.0.0:80`。

**服务端统一配置变量：**

- `SERVER_API_CONFIG_ENABLED`：统一配置总开关，严格使用小写 `true` 或 `false`，默认 `false`。
- `SERVER_API_UPSTREAM_URL`：真实上游地址，默认空；开启时必填，只接受安全的 `http://` 或 `https://` URL，不接受 userinfo、query 或 fragment。
- `SERVER_API_KEY`：上游 API Key，默认空；开启时必填。填写原始 Key，不要添加 `Bearer ` 前缀。允许字母、数字及 `._~+/=-`，最大 4096 字符。
- `SERVER_API_MODEL`：统一使用的模型，默认 `gpt-image-2`；必须以字母或数字开头，其余字符仅允许字母、数字及 `._~:/+@=-`，最大 256 字符。
- `SERVER_API_MODE`：`images` 或 `responses`，默认 `images`。Nginx 会据此只放行对应的 Images API 或 Responses API 路径。
- `SERVER_API_MODEL_OPTIONS`：允许用户在设置里选择的模型列表，逗号分隔，默认开放 `gpt-image-2,gpt-5.5`，覆盖 Images API 和 Responses API 常用模型。列表项仍需符合模型 ID 字符限制。
- `SERVER_API_MODE_OPTIONS`：允许用户在设置里选择的接口模式，逗号分隔，可包含 `images`、`responses`，默认开放 `images,responses`。Nginx 会按该列表放行对应路径；如需限制用户只能使用单一协议，可显式设置为 `images` 或 `responses`。
- `SERVER_API_ALLOW_CUSTOM_MODEL`：是否允许用户在设置里输入自定义模型 ID，严格使用小写布尔值，默认 `true`；设为 `false` 时只能选择 `SERVER_API_MODEL_OPTIONS` 中的模型。
- `SERVER_API_CODEX_CLI`：是否启用 Codex CLI 兼容参数，严格使用小写布尔值，默认 `false`。
- `SERVER_API_RESPONSE_FORMAT_B64_JSON`：是否请求 Base64 JSON 图片结果，严格使用小写布尔值，默认 `false`。
- `SERVER_API_TIMEOUT_SECONDS`：请求超时秒数，必须是 `10..600` 的十进制整数，默认 `600`。

统一模式仅支持 OpenAI 兼容接口，不支持 fal.ai 或自定义 Provider。开启后，服务端会强制启用并锁定 `/api-proxy`，将代理目标固定为 `SERVER_API_UPSTREAM_URL`，并用 `SERVER_API_KEY` 生成的 Authorization 覆盖任何客户端请求头；`API_PROXY_URL`、`ENABLE_API_PROXY` 和 `LOCK_API_PROXY` 不再决定实际代理行为。用户只能在部署端通过 `SERVER_API_MODE_OPTIONS` 预设的范围内选择接口模式；模型默认允许选择预设项或输入自定义模型 ID，也可通过 `SERVER_API_ALLOW_CUSTOM_MODEL=false` 限制为只能选择 `SERVER_API_MODEL_OPTIONS`。用户不能修改 API URL 或 API Key。

统一模式访问 HTTPS upstream 时会启用 SNI，并使用镜像内系统 CA 校验证书链与主机名；证书无效、过期、自签名或主机名不匹配时请求会失败。若使用 HTTP，Bearer Key 和请求内容不会被加密，只能用于受信任内网、VPN 或其他隔离网络，禁止经过不可信公网链路。

为避免连接失败时在容器日志中回显 upstream 主机、IP、路径或其他部署细节，统一模式会抑制代理 location 的底层运行时错误日志；客户端仍会收到对应 HTTP 错误状态。兼容模式继续将代理错误写入 stderr，便于沿用原有排查方式。

客户端保存的 Profiles、API URL/Key、URL 参数、配置导入和历史任务中的服务商、地址、密钥等固定 API 配置均不能覆盖统一配置；模型字段仅在 `SERVER_API_ALLOW_CUSTOM_MODEL=true` 时允许作为用户选择生效。浏览器只能读取不含 Key 和上游 URL 的 `/runtime-config.json`；配置非法时容器启动会非零退出，运行时配置加载或校验失败时前端禁止提交，不会回退到客户端配置。

> ⚠️ **付费代理风险**：统一模式会暴露一个可消耗服务端额度的同源代理入口，项目本身不提供登录、租户隔离或完整限流。公网部署必须在外层增加认证、VPN、IP 白名单、网关限流等访问控制；仅隐藏 API Key 不能防止额度被滥用。

> 静态托管无法安全保存服务端 Key，也无法实现覆盖 Authorization 的反向代理，因此纯静态 Vercel、GitHub Pages、Netlify 等部署不能直接启用此模式。需要使用本 Docker/Nginx 实现，或自行实现等价的 `/runtime-config.json` 与 `/api-proxy/` 服务端协议。

**1. 服务端统一配置：Docker CLI 示例**

```bash
docker run -d -p 8080:80 \
  -e SERVER_API_CONFIG_ENABLED=true \
  -e SERVER_API_UPSTREAM_URL=https://api.openai.com/v1 \
  -e SERVER_API_KEY=sk-your-server-key \
  -e SERVER_API_MODEL=gpt-image-2 \
  -e SERVER_API_MODE=images \
  -e SERVER_API_MODEL_OPTIONS=gpt-image-2,gpt-5.5 \
  -e SERVER_API_MODE_OPTIONS=images,responses \
  -e SERVER_API_ALLOW_CUSTOM_MODEL=true \
  -e SERVER_API_CODEX_CLI=false \
  -e SERVER_API_RESPONSE_FORMAT_B64_JSON=false \
  -e SERVER_API_TIMEOUT_SECONDS=600 \
  ghcr.io/<owner>/<repo>:latest
```

**2. 服务端统一配置：Docker Compose 示例**

```yaml
services:
  gpt-image-playground:
    image: ghcr.io/<owner>/<repo>:latest
    environment:
      SERVER_API_CONFIG_ENABLED: "true"
      SERVER_API_UPSTREAM_URL: "https://api.openai.com/v1"
      SERVER_API_KEY: "${OPENAI_API_KEY}"
      SERVER_API_MODEL: "gpt-image-2"
      SERVER_API_MODE: "images"
      SERVER_API_MODEL_OPTIONS: "gpt-image-2,gpt-5.5"
      SERVER_API_MODE_OPTIONS: "images,responses"
      SERVER_API_ALLOW_CUSTOM_MODEL: "true"
      SERVER_API_CODEX_CLI: "false"
      SERVER_API_RESPONSE_FORMAT_B64_JSON: "false"
      SERVER_API_TIMEOUT_SECONDS: "600"
    ports:
      - "8080:80"
    restart: unless-stopped
```

**3. Dokploy 部署**

在 Dokploy 中创建 Compose 应用并连接本仓库：

1. Compose Path 填 `./docker-compose.yml`。
2. 在 Domains 中添加域名，Service 选择 `gpt-image-playground`，Container Port 填 `80`。
3. 如需服务端统一配置，在 Environment 中填入 `.env.example` 对应变量，并将 `SERVER_API_CONFIG_ENABLED` 设为 `true`。
4. `SERVER_API_KEY` 只能放在 Dokploy Environment 中，不要写入仓库文件。

如需受限 Agent，在 Dokploy 中设置 `RESTRICTED_AGENT_ENABLED=true` 和全部必填 `AGENT_*` 变量。域名仍绑定前端 `gpt-image-playground:80`，不要单独暴露 Gateway 端口。

回滚时将 `SERVER_API_CONFIG_ENABLED=false` 并重启容器，即可恢复原有 `DEFAULT_API_URL` / `API_PROXY_URL` / `ENABLE_API_PROXY` / `LOCK_API_PROXY` 行为。使用 `latest` 标签时，重新拉取镜像并重启即可更新（如 `docker compose pull && docker compose up -d`）；生产环境建议固定版本标签。

</details>

<details>
<summary><strong>💻 方式四：本地开发与静态构建</strong></summary>

**1. 环境准备与启动**

你可以在项目根目录新建 `.env.local` 文件配置默认 API URL（如 `VITE_DEFAULT_API_URL=https://api.openai.com/v1`）。然后安装依赖并启动：

```bash
npm install
npm run dev
```

**2. 本地开发跨域代理 (可选)**

如果在本地开发时遇到浏览器的 CORS 限制，可开启本地代理转发：

```bash
cp dev-proxy.config.example.json dev-proxy.config.json
```

修改 `dev-proxy.config.json`，将 `target` 设置为真实的图片接口地址。重启开发服务器后，在页面设置中开启 **API 代理** 即可（请求将被转发如 `http://localhost:5173/api-proxy/... -> target/...`）。此功能仅在 `npm run dev` 阶段生效，不会影响打包产物。

**3. 本地故障模拟 API (可选)**

如果需要复现图片 URL 跨域、接口返回结构异常、原始响应查看等问题，可启动内置模拟服务：

```powershell
npm run mock:api
```

使用方式见 [本地故障模拟 API](docs/mock-image-api.md)。

**4. 构建静态产物**

```bash
npm run build
```

Gateway 使用独立依赖和构建目录：

```bash
npm --prefix gateway ci
npm run test:gateway
npm run build:gateway
```

本地联调受限模式建议使用 Docker Compose profile，避免在开发服务器中复制生产安全边界：

```bash
docker compose up --build
```

构建输出的文件位于 `dist/` 目录下，可将其部署至任何静态文件服务器（如普通 Nginx、GitHub Pages、Netlify 等）。

</details>

---

## 🛠️ URL 传参快速填充

应用支持通过 URL 查询参数快速填入配置，非常适合创建书签或集成分享。根据你的服务商类型，选择对应的方式：

**方式一：标准 OpenAI 兼容服务商**
直接使用简短的查询参数配置：
- `?apiUrl=https://你的代理地址.com`
- `?apiKey=sk-xxxx`
- `?apiMode=images` 或 `?apiMode=responses`（未传时默认为 `images`）
- `?model=gpt-image-2`（未传时按 `apiMode` 使用默认模型）
- `?codexCli=true`（开启 Codex CLI 兼容模式）

例如，集成到 New API 的聊天系统：

```text
https://your-domain.example?apiUrl={address}&apiKey={key}&model={model}
```

```text
https://your-pages-domain.example?apiUrl={address}&apiKey={key}&model={model}
```

**方式二：自定义格式服务商**
如果需要导入自定义格式的 API 配置，请使用 `settings` 参数并传入 URL 编码后的完整 JSON：
- `?settings={URL编码后的JSON}`（只读取 `customProviders` 和 `profiles` 列表）

> 推荐先在项目内完成配置生成与导入：
>
> **设置 - API 配置 - 服务商类型 - 创建自定义服务商 - AI 一键生成与导入**
>
> 完成后可在 **API 配置 - 当前配置** 使用右侧快捷按钮：
>
> - **链接按钮**：复制可导入配置的 URL。复制时可选择不包含 API Key，并使用 `{address}`、`{key}`、`{model}` 等变量，便于在 New API 等平台中集成分享。
> - **复制按钮**：将当前配置复制一份到配置列表底部，新配置名称会追加“（复制）”。

JSON 结构示例：

```json
{
  "customProviders": [
    {
      "id": "custom-example-task",
      "name": "示例异步任务服务商",
      "submit": {
        "path": "images/generations",
        "method": "POST",
        "contentType": "json",
        "body": {
          "model": "$profile.model",
          "prompt": "$prompt",
          "size": "$params.size",
          "quality": "$params.quality",
          "output_format": "$params.output_format",
          "output_compression": "$params.output_compression",
          "n": "$params.n",
          "image_urls": "$inputImages.dataUrls"
        },
        "taskIdPath": "data.0.task_id"
      },
      "poll": {
        "path": "tasks/{task_id}",
        "method": "GET",
        "intervalSeconds": 5,
        "statusPath": "data.status",
        "successValues": ["completed"],
        "failureValues": ["failed", "cancelled"],
        "errorPath": "data.error.message",
        "result": {
          "imageUrlPaths": ["data.result.images.*.url.*"],
          "b64JsonPaths": []
        }
      }
    }
  ],
  "profiles": [
    {
      "name": "示例异步任务服务商",
      "provider": "custom-example-task",
      "baseUrl": "https://api.example.com/v1",
      "model": "example-image-model",
      "apiMode": "images"
    }
  ]
}
```

第三方服务商可以参考 [自定义服务商 LLM 提示词](docs/custom-provider-llm-prompt.md)，让 LLM 根据自己的 API 文档生成可导入的完整配置。导入后只需要在设置里补充 API Key。

---

## 💻 技术栈

<div align="center">
  <br>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS_3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS 3" /></a>
  <a href="https://zustand.docs.pmnd.rs/"><img src="https://img.shields.io/badge/Zustand-764ABC?style=for-the-badge&logo=react&logoColor=white" alt="Zustand" /></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" /></a>
  <a href="https://sqlite.org/"><img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" /></a>
  <br>
  <br>
</div>

## 📄 许可证 & 致谢

本项目基于 [MIT License](LICENSE) 开源。

特别致谢：[LINUX DO](https://linux.do)
