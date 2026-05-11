import http, {IncomingMessage, ServerResponse} from 'http'
import {URL} from 'url'
import {createConsoleStreamWrapper, getWorkerConfig, resolveDependency} from '../util'
import {writeFileSync} from 'fs'
import {ensureDirSync} from 'fs-extra'
import {basename, dirname, join} from 'path'
import {WorkerConfig} from '@xgsd/workers'
import {WorkerConfigSchema} from '../validation'
import {parse} from 'valibot'
import {createHash} from 'crypto'
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

  const app = await createServer(opts)

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

type Opts = {
  cwd: string
  configPath: string
}

async function createHttpTransporter(opts: Opts) {
  const {createHandler} = resolveDependency('@xgsd/workers', opts.cwd)
  const {cwd, configPath} = opts

  return {
    callback: async (req: IncomingMessage, res: ServerResponse) => {
      const config = await getWorkerConfig(configPath)

      const signals = join(cwd, config.dist, 'signals.jsonl')
      const stream = createConsoleStreamWrapper(signals)

      const opts = {
        config,
        stream,
        validator: (config: WorkerConfig) => parse(WorkerConfigSchema, config),
      }

      let handler
      try {
        handler = createHandler(opts)
      } catch (error) {
        return send(res, 500, {message: 'not configured to accept requests'})
      }

      const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
      const path = url.pathname
      const headers = req.headers
      const body = await readBody(req)
      const query = Object.fromEntries(url.searchParams)
      const method = req.method

      const data = {
        path,
        method,
        headers,
        query,
        body,
      }

      try {
        const result = await handler({
          cwd,
          data,
          env: {},
        })

        if (result.error) {
          return send(res, 400, result)
        } else {
          return send(res, 200, result)
        }
      } catch (error) {
        console.log(error)
        return send(res, 500, {
          message: 'system error',
        })
      }
    },
  }
}

export async function createServer(opts: {
  concurrency?: number
  env?: Record<string, unknown>
  cwd?: string
  configPath?: string
}) {
  const {configPath, cwd} = opts

  console.log(`[http] bound to ${cwd}`)

  if (!configPath || !cwd) {
    throw new Error('expected config path and cwd')
  }

  const transport = await createHttpTransporter({configPath, cwd})

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    return transport.callback(req, res)
    /*
    if (url.pathname === '/health') {
      return send(res, 200, {ok: true})
    }

    if (url.pathname === '/run' && req.method === 'POST') {
      const body = await readBody(req)
      const config = (await getWorkerConfig(configPath)) as WorkerConfig

      if (!config) {
        return send(res, 404, {
          error: {
            message: `could not found at ${configPath}`,
          },
        })
      }

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
    })*/
  })
}
