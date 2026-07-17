import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const shellScripts = [
  'deploy/inject-api-url.sh',
  'deploy/migrate-api-env.envsh',
  'deploy/run-agent-gateway.sh',
]

describe('Docker entrypoint line endings', () => {
  for (const file of shellScripts) {
    it(`${file} uses LF line endings`, () => {
      expect(readFileSync(file, 'utf8')).not.toContain('\r')
    })
  }
})

describe('Docker server-managed API defaults', () => {
  it('compiles the frontend as a runtime-config-required build', () => {
    const dockerfile = readFileSync('deploy/Dockerfile', 'utf8')
    expect(dockerfile).toContain('ENV DEPLOY_TARGET=runtime')
    expect(dockerfile.indexOf('ENV DEPLOY_TARGET=runtime')).toBeLessThan(dockerfile.indexOf('RUN npm run build'))
  })

  it('exposes both implemented OpenAI image protocols by default', () => {
    expect(readFileSync('deploy/Dockerfile', 'utf8')).toContain('ENV SERVER_API_MODE_OPTIONS=images,responses')
    expect(readFileSync('docker-compose.yml', 'utf8')).toContain('SERVER_API_MODE_OPTIONS: ${SERVER_API_MODE_OPTIONS:-images,responses}')

    const migrateScript = readFileSync('deploy/migrate-api-env.envsh', 'utf8')
    expect(migrateScript).toContain('RUNTIME_SERVER_API_MODE_OPTIONS=\'["images","responses"]\'')
    expect(migrateScript).toContain('input=${1:-images,responses}')
  })

  it('exposes default models for both Images and Responses API by default', () => {
    expect(readFileSync('deploy/Dockerfile', 'utf8')).toContain('ENV SERVER_API_MODEL_OPTIONS=gpt-image-2,gpt-5.5')
    expect(readFileSync('docker-compose.yml', 'utf8')).toContain('SERVER_API_MODEL_OPTIONS: ${SERVER_API_MODEL_OPTIONS:-gpt-image-2,gpt-5.5}')
    expect(readFileSync('deploy/Dockerfile', 'utf8')).toContain('ENV SERVER_API_ALLOW_CUSTOM_MODEL=true')
    expect(readFileSync('docker-compose.yml', 'utf8')).toContain('SERVER_API_ALLOW_CUSTOM_MODEL: ${SERVER_API_ALLOW_CUSTOM_MODEL:-true}')

    const migrateScript = readFileSync('deploy/migrate-api-env.envsh', 'utf8')
    expect(migrateScript).toContain('RUNTIME_SERVER_API_MODEL_OPTIONS=\'["gpt-image-2","gpt-5.5"]\'')
    expect(migrateScript).toContain('RUNTIME_SERVER_API_ALLOW_CUSTOM_MODEL=true')
    expect(migrateScript).toContain('SERVER_API_ALLOW_CUSTOM_MODEL=${SERVER_API_ALLOW_CUSTOM_MODEL-true}')
    expect(migrateScript).toContain('input=${1:-gpt-image-2,gpt-5.5}')
  })
})

describe('Restricted Agent deployment boundary', () => {
  it('keeps both server-side routes behind independently removable blocks', () => {
    const nginx = readFileSync('deploy/nginx.conf', 'utf8')
    const agentBlock = nginx.match(/# BEGIN RESTRICTED AGENT[\s\S]*?# END RESTRICTED AGENT/)?.[0] ?? ''
    expect(nginx).toContain('# BEGIN RESTRICTED AGENT')
    expect(agentBlock).toContain('location ^~ /agent-api/')
    expect(agentBlock).toContain('proxy_pass http://agent-gateway:3000/;')
    expect(agentBlock).toContain('client_max_body_size 129m;')
    expect(agentBlock).toContain('proxy_set_header Host $http_host;')
    expect(agentBlock).toContain('proxy_set_header X-Forwarded-Host $http_x_forwarded_host;')
    expect(agentBlock).toContain('proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;')
    expect(agentBlock).not.toContain('proxy_set_header X-Forwarded-Proto $scheme;')
    expect(agentBlock).toContain('proxy_request_buffering off;')
    expect(agentBlock).toContain('proxy_buffering off;')

    const entrypoint = readFileSync('deploy/inject-api-url.sh', 'utf8')
    expect(entrypoint).toContain('if [ "$RESTRICTED_AGENT_ENABLED" != "true" ]')
    expect(entrypoint).toContain('if [ "$ENABLE_API_PROXY" != "true" ] || [ "$RESTRICTED_AGENT_ENABLED" = "true" ]')
  })

  it('normalizes agent-only independently without hiding Legacy when Agent is disabled', () => {
    const migrate = readFileSync('deploy/migrate-api-env.envsh', 'utf8')
    expect(migrate).toContain('RESTRICTED_AGENT_ONLY=${RESTRICTED_AGENT_ONLY-false}')
    expect(migrate).toContain("*) server_api_config_error 'RESTRICTED_AGENT_ONLY must be true or false'")
    expect(migrate).toContain('if [ "$RESTRICTED_AGENT_ENABLED" != "true" ]; then\n    RESTRICTED_AGENT_ONLY=false')
    expect(migrate).toContain('RUNTIME_RESTRICTED_AGENT_ONLY=$RESTRICTED_AGENT_ONLY')

    const injector = readFileSync('deploy/inject-api-url.sh', 'utf8')
    expect(injector).toContain('"$RUNTIME_RESTRICTED_AGENT_ONLY"')
  })

  it('keeps the static runtime config backward-compatible and disabled', () => {
    const runtimeConfigText = readFileSync('public/runtime-config.json', 'utf8')
    const runtimeConfig = JSON.parse(runtimeConfigText)
    expect(runtimeConfig).toEqual({ version: 1, serverApi: { enabled: false } })
    expect(runtimeConfigText).not.toMatch(/apiKey|sessionSecret|upstream/i)
  })

  it('emits minimal mutually exclusive runtime schemas for each capability mode', () => {
    const injector = readFileSync('deploy/inject-api-url.sh', 'utf8')
    expect(injector).toContain('if [ "$RUNTIME_SERVER_API_ENABLED" = "true" ]; then')
    expect(injector).toContain('elif [ "$RUNTIME_RESTRICTED_AGENT_ENABLED" = "true" ]; then')
    expect(injector).toContain('"serverApi": { "enabled": false }')
    expect(injector).toContain('"restrictedAgent": {')
    expect(injector).toContain('"provider": "openai"')
    expect(injector).toContain('"proxyPath": "/api-proxy"')
    expect(injector).toContain('RUNTIME_CONFIG_TMP=${RUNTIME_CONFIG_PATH}.tmp')
    expect(injector).toContain('mv "$RUNTIME_CONFIG_TMP" "$RUNTIME_CONFIG_PATH"')
  })

  it('defines an internal-only, persistent and health-checked Gateway service', () => {
    const compose = readFileSync('docker-compose.yml', 'utf8')
    expect(compose).toContain('agent-gateway:')
    expect(compose).toContain('context: ./gateway')
    expect(compose).toContain('dockerfile: Dockerfile')
    expect(compose).not.toContain('profiles:')
    expect(compose.match(/RESTRICTED_AGENT_ENABLED: \$\{RESTRICTED_AGENT_ENABLED:-false\}/g)).toHaveLength(2)
    expect(compose).toContain('RESTRICTED_AGENT_ONLY: ${RESTRICTED_AGENT_ONLY:-false}')
    expect(compose).toContain('./deploy/run-agent-gateway.sh:/usr/local/bin/run-agent-gateway.sh:ro')
    expect(compose).toContain('command: ["/bin/sh", "/usr/local/bin/run-agent-gateway.sh"]')
    expect(compose).toContain('agent-gateway-data:/data')
    expect(compose).toContain('read_only: true')
    expect(compose).toContain('no-new-privileges:true')
    expect(compose).toContain('cap_drop:')
    expect(compose).toContain("fetch('http://127.0.0.1:3000/healthz')")
    expect(compose).not.toMatch(/agent-gateway:[\s\S]*?ports:/)
  })

  it('publishes both frontend and Gateway multi-architecture images', () => {
    const workflow = readFileSync('.github/workflows/docker.yml', 'utf8')
    expect(workflow).toContain('file: deploy/Dockerfile')
    expect(workflow).toContain('context: ./gateway')
    expect(workflow).toContain('file: ./gateway/Dockerfile')
    expect(workflow.match(/platforms: linux\/amd64,linux\/arm64/g)).toHaveLength(2)
  })
})
