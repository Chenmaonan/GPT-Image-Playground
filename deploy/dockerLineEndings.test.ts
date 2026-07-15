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
