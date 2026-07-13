# Server-Managed API Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-controlled API configuration mode that makes one non-secret runtime profile authoritative for every application request while keeping the provider credential and upstream URL on the server.

**Architecture:** Load a no-store public runtime configuration before React renders, derive a fixed effective OpenAI-compatible profile, and enforce it again at Store and request boundaries. Docker/Nginx generates the public metadata, fixes the upstream, and injects the private Authorization header.

**Tech Stack:** React 19, TypeScript 5.8, Zustand 5, Vite 6, Vitest 4, Nginx Alpine, POSIX shell.

## Global Constraints

- Server-managed mode defaults to `false`.
- The first release supports OpenAI-compatible Images and Responses APIs only.
- Never expose `SERVER_API_KEY` or `SERVER_API_UPSTREAM_URL` to browser assets, runtime JSON, localStorage, exports, logs, or error messages.
- Server-managed mode must fail closed and never fall back to a client profile.
- Existing client profiles remain dormant and become active again when server-managed mode is disabled.
- Do not add dependencies, delete files, deploy, publish, or push.

---

### Task 1: Runtime configuration loader and effective profile

**Files:**
- Create: `public/runtime-config.json`
- Create: `src/lib/serverApiConfig.ts`
- Create: `src/lib/serverApiConfig.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `loadRuntimeConfig(): Promise<void>`, `initializeRuntimeConfig(raw: unknown): RuntimeConfigState`, `getRuntimeConfigState(): RuntimeConfigState`, `isServerApiConfigEnabled(): boolean`, `isServerApiConfigUsable(): boolean`, `getServerManagedApiProfile(): ApiProfile | null`, `getEffectiveApiProfile(settings): ApiProfile`, `getEffectiveSettings(settings): AppSettings`, `sanitizeSettingsPatchForServerMode(patch): Partial<AppSettings>`.
- Runtime JSON shape: `{ version: 1, serverApi: { enabled: boolean, provider?: 'openai', model?: string, apiMode?: 'images' | 'responses', codexCli?: boolean, responseFormatB64Json?: boolean, timeoutSeconds?: number, proxyPath?: string } }`.

- [ ] **Step 1: Write parsing and effective-profile tests**

```ts
it('builds a fixed profile without a browser credential', () => {
  initializeRuntimeConfig({ version: 1, serverApi: { enabled: true, provider: 'openai', model: 'gpt-image-2', apiMode: 'images', codexCli: false, responseFormatB64Json: false, timeoutSeconds: 600, proxyPath: '/api-proxy' } })
  expect(getEffectiveApiProfile(DEFAULT_SETTINGS)).toMatchObject({
    id: 'server-managed-openai', provider: 'openai', apiKey: '', model: 'gpt-image-2', apiMode: 'images', apiProxy: true,
  })
})

it('fails closed when runtime configuration is unavailable', () => {
  initializeRuntimeConfig(null)
  expect(isServerApiConfigUsable()).toBe(false)
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run src/lib/serverApiConfig.test.ts`

Expected: FAIL because `serverApiConfig.ts` does not exist.

- [ ] **Step 3: Implement strict parsing, singleton state, effective settings, and patch sanitizing**

```ts
export type RuntimeConfigState =
  | { status: 'loading' }
  | { status: 'ready'; config: PublicRuntimeConfig }
  | { status: 'error'; error: string }

export async function loadRuntimeConfig() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}runtime-config.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    runtimeState = { status: 'ready', config: parsePublicRuntimeConfig(await response.json()) }
  } catch (error) {
    runtimeState = { status: 'error', error: error instanceof Error ? error.message : String(error) }
  }
}
```

The disabled default file must be exactly:

```json
{
  "version": 1,
  "serverApi": { "enabled": false }
}
```

- [ ] **Step 4: Load configuration before rendering React**

```ts
async function bootstrap() {
  await loadRuntimeConfig()
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
}

void bootstrap()
```

- [ ] **Step 5: Run the focused tests**

Run: `npx vitest run src/lib/serverApiConfig.test.ts`

Expected: PASS.

### Task 2: Force the server profile at API and compatibility boundaries

**Files:**
- Modify: `src/lib/apiProfiles.ts`
- Modify: `src/lib/devProxy.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/openaiCompatibleImageApi.ts`
- Modify: `src/lib/paramCompatibility.ts`
- Modify: `src/lib/api.test.ts`
- Modify: `src/lib/apiProfiles.test.ts`

**Interfaces:**
- Consumes: `getEffectiveApiProfile`, `getEffectiveSettings`, `isServerApiConfigEnabled`, `isServerApiConfigUsable`.
- Produces: all API callers use the server profile, a same-origin proxy URL, and no browser Authorization when managed mode is enabled.

- [ ] **Step 1: Add request-boundary regression tests**

```ts
it('ignores a malicious fal profile and uses the managed OpenAI proxy', async () => {
  setManagedRuntimeConfig()
  await callImageApi({ ...baseOptions, settings: maliciousFalSettings })
  expect(fetchMock).toHaveBeenCalledWith('/api-proxy/images/generations', expect.objectContaining({
    headers: { 'Content-Type': 'application/json' },
  }))
})

it('does not send a provider Authorization header in managed mode', async () => {
  setManagedRuntimeConfig()
  await callImageApi({ ...baseOptions, settings: keyedClientSettings })
  expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization')
})
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run src/lib/api.test.ts src/lib/apiProfiles.test.ts`

Expected: FAIL because the client profile still controls dispatch and headers.

- [ ] **Step 3: Route through effective settings and server proxy helpers**

```ts
export async function callImageApi(opts: CallApiOptions): Promise<CallApiResult> {
  const settings = getEffectiveSettings(opts.settings)
  const profile = getEffectiveApiProfile(settings)
  if (profile.provider === 'fal') return callFalAiImageApi({ ...opts, settings }, profile)
  return callOpenAICompatibleImageApi({ ...opts, settings }, profile, getCustomProviderDefinition(settings, profile.provider))
}
```

`createRequestHeaders()` must return `{}` in managed mode. Managed URLs must use the configured `proxyPath` and must not depend on a dormant base URL. If runtime state is not usable, throw `服务端 API 配置不可用` before any fetch.

- [ ] **Step 4: Make compatibility calculations use the effective profile**

```ts
const activeProfile = getEffectiveApiProfile(settings)
```

Use this for output limits, Codex CLI normalization, and all direct reads of active provider behavior.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run src/lib/api.test.ts src/lib/apiProfiles.test.ts src/lib/paramCompatibility.test.ts`

Expected: PASS.

### Task 3: Close Store, URL, import, retry, and recovery bypasses

**Files:**
- Modify: `src/store.ts`
- Modify: `src/lib/urlSettings.ts`
- Modify: `src/store.test.ts`
- Modify: `src/lib/urlSettings.test.ts`

**Interfaces:**
- Consumes: server configuration helpers from Task 1.
- Produces: dormant client settings remain persisted, while every API operation and configuration entry point obeys managed mode.

- [ ] **Step 1: Add Store and URL bypass tests**

```ts
it('ignores API settings patches while preserving general preferences', () => {
  setManagedRuntimeConfig()
  useStore.getState().setSettings({ apiKey: 'attacker', model: 'other', clearInputAfterSubmit: true })
  expect(useStore.getState().settings.apiKey).not.toBe('attacker')
  expect(useStore.getState().settings.clearInputAfterSubmit).toBe(true)
})

it('clears but does not apply URL API configuration in managed mode', () => {
  setManagedRuntimeConfig()
  const params = new URLSearchParams('apiUrl=https://evil.example&apiKey=bad&model=other')
  expect(buildSettingsFromUrlParams(DEFAULT_SETTINGS, params)).toEqual({})
})
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run src/store.test.ts src/lib/urlSettings.test.ts`

Expected: FAIL because settings patches and URL parameters still update profiles.

- [ ] **Step 3: Sanitize API settings writes and derive effective request settings**

Inside `setSettings`, replace the incoming patch with `sanitizeSettingsPatchForServerMode(s)` before merging. In `submitTask`, `executeTask`, `retryTask`, `reuseConfig`, network hints, Codex prompts, and task-profile lookup, use `getEffectiveSettings()` and `getEffectiveApiProfile()`.

When managed mode is enabled:

```ts
if (isServerApiConfigEnabled()) {
  activeProfile = getEffectiveApiProfile(settings)
  requestSettings = getEffectiveSettings(settings)
}
```

`validateApiProfile` must not require a browser Key for the managed profile.

- [ ] **Step 4: Block imported and historical API profiles**

`buildSettingsFromUrlParams()` returns `{}` in managed mode while the caller still removes known keys. ZIP import applies only the general-preference whitelist. `reuseConfig()` restores input and parameters but never sets `reusedTaskApiProfileId`. Retrying creates task metadata from the server profile.

- [ ] **Step 5: Fail old incompatible asynchronous recoveries safely**

At initialization, managed mode must convert running fal/custom tasks to `error` with a clear message and persist the updated task. It must not schedule `recoverFalTask` or `recoverCustomTask`.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/store.test.ts src/lib/urlSettings.test.ts`

Expected: PASS.

### Task 4: Present a read-only managed configuration UI

**Files:**
- Modify: `src/components/SettingsModal.tsx`
- Modify: `src/components/InputBar.tsx`
- Modify: `src/components/DetailModal.tsx`
- Modify: `src/components/TaskCard.tsx`
- Modify: `src/components/HistorySidebar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `getRuntimeConfigState`, `getEffectiveApiProfile`, `isServerApiConfigEnabled`, `isServerApiConfigUsable`.
- Produces: no editable API controls or misleading historical-profile actions while managed mode is active.

- [ ] **Step 1: Replace the API editor with a read-only branch**

```tsx
{serverManaged ? (
  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
    <h4 className="font-medium">API 配置由服务端统一管理</h4>
    <dl>
      <div><dt>服务商</dt><dd>OpenAI 兼容接口</dd></div>
      <div><dt>API 接口</dt><dd>{serverProfile.apiMode === 'responses' ? 'Responses API' : 'Images API'}</dd></div>
      <div><dt>模型</dt><dd>{serverProfile.model}</dd></div>
    </dl>
  </div>
) : existingApiEditor}
```

Hide the historical API-profile preference and all profile/import/copy/custom-provider controls in this branch.

- [ ] **Step 2: Update submit availability and errors**

```ts
const hasSubmitApiConfig = serverManaged
  ? isServerApiConfigUsable()
  : Boolean(activeProfile.apiKey)
```

When runtime config is unavailable, the tooltip must say `服务端 API 配置不可用，请联系部署管理员` instead of sending the user to API settings.

- [ ] **Step 3: Update historical action labels and behavior**

In managed mode, render `复用输入与参数`; otherwise retain `复用配置`. Retry remains available but always uses the server profile through Store enforcement.

- [ ] **Step 4: Run TypeScript and relevant tests**

Run: `npx tsc -b --pretty false`

Expected: exit code 0.

### Task 5: Generate runtime metadata and inject credentials in Docker/Nginx

**Files:**
- Modify: `deploy/Dockerfile`
- Modify: `deploy/migrate-api-env.envsh`
- Modify: `deploy/inject-api-url.sh`
- Modify: `deploy/nginx.conf`
- Modify: `public/sw.js`

**Interfaces:**
- Consumes: `SERVER_API_CONFIG_ENABLED`, `SERVER_API_UPSTREAM_URL`, `SERVER_API_KEY`, `SERVER_API_MODEL`, `SERVER_API_MODE`, `SERVER_API_CODEX_CLI`, `SERVER_API_RESPONSE_FORMAT_B64_JSON`, `SERVER_API_TIMEOUT_SECONDS`.
- Produces: `/runtime-config.json`, fixed upstream routing, server Authorization injection, path restrictions, and no-store caching.

- [ ] **Step 1: Add Docker environment defaults**

```dockerfile
ENV SERVER_API_CONFIG_ENABLED=false
ENV SERVER_API_UPSTREAM_URL=
ENV SERVER_API_KEY=
ENV SERVER_API_MODEL=gpt-image-2
ENV SERVER_API_MODE=images
ENV SERVER_API_CODEX_CLI=false
ENV SERVER_API_RESPONSE_FORMAT_B64_JSON=false
ENV SERVER_API_TIMEOUT_SECONDS=600
```

- [ ] **Step 2: Validate and normalize managed configuration at startup**

When enabled, require a safe HTTP(S) upstream URL, non-empty Key and model, enum mode, strict lowercase booleans, and timeout `10..600`. Export `API_PROXY_URL`, `API_PROXY_AUTHORIZATION`, and `SERVER_API_ALLOWED_PATHS`; force proxy availability and lock values.

```sh
if [ "$SERVER_API_CONFIG_ENABLED" = "true" ]; then
  [ -n "$SERVER_API_UPSTREAM_URL" ] || { echo "SERVER_API_UPSTREAM_URL is required" >&2; exit 1; }
  [ -n "$SERVER_API_KEY" ] || { echo "SERVER_API_KEY is required" >&2; exit 1; }
  API_PROXY_URL=$SERVER_API_UPSTREAM_URL
  API_PROXY_AUTHORIZATION="Bearer $SERVER_API_KEY"
fi
```

- [ ] **Step 3: Generate public runtime JSON without secrets**

The generated file must contain only public fields:

```json
{
  "version": 1,
  "serverApi": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-image-2",
    "apiMode": "images",
    "codexCli": false,
    "responseFormatB64Json": false,
    "timeoutSeconds": 600,
    "proxyPath": "/api-proxy"
  }
}
```

- [ ] **Step 4: Override Authorization and prevent runtime-config caching**

```nginx
location = /runtime-config.json {
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    try_files /runtime-config.json =404;
}

proxy_set_header Authorization "${API_PROXY_AUTHORIZATION}";
```

The Service Worker must return without calling `respondWith` for a request whose pathname ends in `/runtime-config.json`.

- [ ] **Step 5: Verify shell text and generated configuration behavior**

Run: `rg -n "SERVER_API_|runtime-config|API_PROXY_AUTHORIZATION" deploy public/sw.js README.md`

Expected: all managed variables are present; the public JSON path contains no Key or upstream field.

### Task 6: Documentation, regression suite, build, and security audit

**Files:**
- Modify: `README.md`
- Test: all files under `src/**/*.test.ts`

**Interfaces:**
- Produces: documented deployment, compatibility, rollback, and verified artifacts.

- [ ] **Step 1: Document Docker configuration and behavior**

README must state the exact environment variables, OpenAI-compatible-only scope, default-off behavior, ignored URL/import/history configurations, fail-closed behavior, public-proxy abuse risk, access-control requirement, unsupported pure-static secret storage, and rollback by setting `SERVER_API_CONFIG_ENABLED=false`.

- [ ] **Step 2: Run all unit tests**

Run: `npm test`

Expected: all tests pass with no skipped managed-mode regression tests.

- [ ] **Step 3: Build production assets**

Run: `npm run build`

Expected: TypeScript and Vite exit code 0 and `dist/` contains `runtime-config.json`.

- [ ] **Step 4: Audit for secret leakage and stale placeholders**

Use a unique sentinel value only in a temporary environment/process invocation, then search `dist`, public runtime config, and source output. Expected: no sentinel Key in browser-readable files and no unresolved managed placeholders.

- [ ] **Step 5: Inspect actual files and Git state**

Run: `git diff --check`, `git status --short`, and focused `rg` searches for client Authorization and bypass entry points.

Expected: no whitespace errors, only task-related changes, no temporary files, and every API entry point covered by managed-mode enforcement.

- [ ] **Step 6: Request Git commit confirmation**

Do not commit automatically. Present the verified change list and proposed message `feat: 增加服务端统一 API 配置模式`, then wait for the repository-required confirmation.
