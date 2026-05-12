import {Args, Command, Flags} from '@oclif/core'
import {createServer} from '../api/server.js'
import path, {dirname, join, resolve} from 'path'
import {fork, spawn} from 'child_process'
import {pathExistsSync} from 'fs-extra/esm'
import {readFileSync, rmSync} from 'fs'
import {fileURLToPath} from 'url'

export function isBackgroundProcessRunning(path: string, pid?: number): number | boolean {
  function heartbeat(pid: number): number | boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false

    try {
      process.kill(pid, 0)
      return pid
    } catch (err: any) {
      if (err.code === 'ESRCH') return false
      if (err.code === 'EPERM') return true
      throw err
    }
  }

  // If explicit PID provided, trust it
  if (pid !== undefined) {
    return heartbeat(pid)
  }

  // No PID file → nothing running
  if (!pathExistsSync(path)) {
    return false
  }

  const raw = readFileSync(path, 'utf8').trim()
  const resolvedPid = Number(raw)

  if (!Number.isInteger(resolvedPid)) {
    return false
  }

  return heartbeat(resolvedPid)
}

export default class Up extends Command {
  static override args = {}
  static override description = 'Start a server to call your Worker over HTTP'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    port: Flags.integer({char: 'p', default: 3000}),

    detached: Flags.boolean({char: 'd', default: false}),
    force: Flags.boolean({char: 'f', default: false}),

    down: Flags.boolean({
      char: 's',
      description: 'use this flag to stop background process',
      default: false,
    }),

    worker: Flags.string({char: 'w', default: 'worker.js'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Up)
    const port = flags.port

    const entry = resolve(flags.worker)

    // this prevents many services/workers starting
    // which is ok for an example CLI
    const pidPath = join(this.config.configDir, 'xgsd.pid')
    const pid = isBackgroundProcessRunning(pidPath)

    if (flags.down) {
      if (pid) {
        try {
          process.kill(pid as number, 'SIGTERM')
          rmSync(pidPath)
        } catch (error) {}

        this.log(`background service stopped`)
        return
      }

      this.log(`background service not running - remove --down to bring it up`)
      return
    }

    if (flags.detached) {
      if (pid && !flags.force) {
        this.error('service is already running in the background.\nUse `worker up -d -f`.')
      }

      if (pid && flags.force) {
        try {
          process.kill(pid as number, 'SIGTERM')
          rmSync(pidPath)
        } catch (error) {}
      }

      const path = fileURLToPath(import.meta.url)
      const daemonPath = resolve(path, '..', '..', 'api', 'daemon.js')
      const child = spawn(process.execPath, [daemonPath], {
        detached: true,
        stdio: 'ignore',
        env: {
          XGSD_PORT: String(port),
          //XGSD_HOST: flags.host,
          XGSD_ENTRY_PATH: entry,
          XGSD_PID_PATH: pidPath,
        },
      })

      this.log(`server is running in the background (pid: ${child.pid})`)
      this.log(`[api] running on http://localhost:${port}`)

      child.unref()
    } else {
      const server = await createServer({entry})

      server.listen(port, () => {
        this.log(`[api] running on http://localhost:${port}`)
      })

      // graceful shutdown
      process.on('SIGINT', () => {
        this.log('\n[api] shutting down...')
        server.close(() => process.exit(0))
      })

      process.on('SIGTERM', () => {
        server.close(() => process.exit(0))
      })
    }
  }
}
