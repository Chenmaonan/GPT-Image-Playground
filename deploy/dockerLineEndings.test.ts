import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const shellScripts = [
  'deploy/inject-api-url.sh',
  'deploy/migrate-api-env.envsh',
]

describe('Docker entrypoint line endings', () => {
  for (const file of shellScripts) {
    it(`${file} uses LF line endings`, () => {
      expect(readFileSync(file, 'utf8')).not.toContain('\r')
    })
  }
})

describe('Docker server-managed API defaults', () => {
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

    const migrateScript = readFileSync('deploy/migrate-api-env.envsh', 'utf8')
    expect(migrateScript).toContain('RUNTIME_SERVER_API_MODEL_OPTIONS=\'["gpt-image-2","gpt-5.5"]\'')
    expect(migrateScript).toContain('input=${1:-gpt-image-2,gpt-5.5}')
  })
})
