import {createRequire} from 'module'
import fs from 'fs-extra'
import {join} from 'path'
import {createWriteStream} from 'fs'

export async function getWorkerConfig(path: string): Promise<any | null> {
  if (!fs.pathExists(path)) {
    return null
  }

  // validate it (at some stage)
  return fs.readJson(path)
}

// this may diverge from the version inside @xgsd/workers
// but it avoids needing to depend directly
export function resolveDependency(dependency: string, projectRoot: string): any {
  try {
    const require = createRequire(join(projectRoot, 'package.json'))
    return require(dependency)
  } catch {}

  throw new Error(
    `Could not resolve ${dependency}.\nInstall it with \`yarn add ${dependency}\`.\nPath: ${projectRoot}.`,
  )
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
