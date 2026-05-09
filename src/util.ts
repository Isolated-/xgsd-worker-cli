import {createRequire} from 'module'
import fs from 'fs-extra'
import {join} from 'path'

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
