import http, {IncomingMessage, ServerResponse} from 'http'
import {URL} from 'url'
import {createConsoleStreamWrapper} from '../util.js'
import {writeFileSync} from 'fs'
import {ensureDirSync} from 'fs-extra/esm'
import {dirname, join, resolve} from 'path'
import {createTransport, StreamLike} from '@xgsd/workers'

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
  entry: string
}

async function createHttpTransporter(opts: Opts) {
  const cwd = resolve(dirname(opts.entry))
  const stream = createConsoleStreamWrapper(join(cwd, 'signals.jsonl'), {mode: 'append'}) as StreamLike
  const transport = createTransport({
    entry: opts.entry,
    stream,
  })

  return {
    callback: async (req: IncomingMessage, res: ServerResponse) => {
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
        const result = await transport({data})

        const status = result.ok ? 200 : 400
        return send(res, status, result)
      } catch {
        return send(res, 500, {message: 'something has gone wrong'})
      }
    },
  }
}

export async function createServer(opts: {entry: string}) {
  const {entry} = opts

  console.log(`[http] bound to ${entry}`)

  const transport = await createHttpTransporter({entry})

  return http.createServer(async (req, res) => {
    return transport.callback(req, res)
  })
}
