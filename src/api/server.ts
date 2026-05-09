import http, {IncomingMessage, ServerResponse} from 'http'
import {URL} from 'url'
import {getWorkerConfig, resolveDependency} from '../util'
import {writeFileSync} from 'fs'
import {ensureDirSync} from 'fs-extra'
import {basename, dirname, join} from 'path'

type Json = Record<string, any>

function readBody(req: IncomingMessage): Promise<Json> {
  return new Promise((resolve, reject) => {
    let data = ''

    req.on('data', (chunk) => (data += chunk))

    req.on('end', () => {
      if (!data) {
        return resolve({})
      }

      try {
        resolve(JSON.parse(data))
      } catch (err) {
        reject(err)
      }
    })

    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(payload))
}

export async function startDaemon(opts: any) {
  const port = opts.port ?? 3010
  const pidPath = opts.pidPath

  const app = createServer(opts)

  ensureDirSync(dirname(pidPath))
  writeFileSync(pidPath, String(process.pid))

  app.listen(port, opts.host ?? 'localhost', () => {
    console.log(`[xGSD daemon] running on :${port}`)
  })

  const shutdown = async () => {
    console.log('[xGSD daemon] shutting down...')
    app.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

export function createServer(opts: {
  concurrency?: number
  env?: Record<string, unknown>
  cwd?: string
  configPath?: string
}) {
  const {configPath, cwd} = opts

  if (!configPath || !cwd) {
    throw new Error('expected config path and cwd')
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    if (url.pathname === '/health') {
      return send(res, 200, {ok: true})
    }

    if (url.pathname === '/run' && req.method === 'POST') {
      const body = await readBody(req)
      // TODO: cache this
      const config = await getWorkerConfig(configPath)

      if (!config) {
        return send(res, 404, {
          error: {
            message: `could not found at ${configPath}`,
          },
        })
      }

      const {createHandler} = resolveDependency('@xgsd/workers', cwd)

      const handler = createHandler(config)
      const result = await handler({
        data: body ?? null,
        env: opts.env,
        cwd,
      })

      // TODO: allow user to return status code
      // use 500 for misconfigs/user errors
      const status = result.code ? result.code : result.ok ? 200 : 400
      return send(res, status, result)
    }

    return send(res, 404, {
      ok: false,
      error: 'Not found',
    })
  })
}
