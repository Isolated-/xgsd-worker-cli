import {createRequire} from 'module'
import fs from 'fs-extra/esm'
import {join} from 'path'
import {createWriteStream} from 'fs'

export async function getWorkerConfig(path: string): Promise<any | null> {
  if (!fs.pathExists(path)) {
    return null
  }

  // validate it (at some stage)
  return fs.readJson(path)
}

export const createConsoleStreamWrapper = (path: string, opts: {mode: 'write' | 'append'} = {mode: 'append'}) => {
  const flags = {flags: opts.mode === 'append' ? 'a' : 'w'}
  const stream = createWriteStream(path, flags)

  return {
    write: (chunk: string) => {
      const msg = JSON.parse(chunk.trim())

      if (msg.type === 'error') {
        console.error(`[error] ${msg.message ?? 'check logs'}`)
      }

      if (msg.message && msg.type !== 'error') {
        console.log(`[signal] ${msg.message} (${msg.type})`)
      }

      stream.write(chunk)
    },
  }
}

import {readFileSync, existsSync} from 'fs'
import {fileURLToPath} from 'url'

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''

    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (chunk) => {
      data += chunk
    })

    process.stdin.on('end', () => {
      resolve(data)
    })
  })
}

export async function resolveInput(input?: string) {
  // stdin
  if (!input && !process.stdin.isTTY) {
    const raw = await readStdin()

    if (!raw.trim()) {
      return null
    }

    return JSON.parse(raw)
  }

  if (!input) {
    return null
  }

  // file path
  if (existsSync(input)) {
    return JSON.parse(readFileSync(input, 'utf8'))
  }

  // raw json
  return JSON.parse(input)
}
