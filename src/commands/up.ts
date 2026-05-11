import {Args, Command, Flags} from '@oclif/core'
import {createServer} from '../api/server'
import path, {dirname, join, resolve} from 'path'
import {fork, spawn} from 'child_process'
import {pathExistsSync, readFileSync, rmSync} from 'fs-extra'

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

    config: Flags.string({char: 'c', required: true}),
    detached: Flags.boolean({char: 'd', default: false}),
    force: Flags.boolean({char: 'f', default: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Up)
    const port = flags.port

    const configPath = resolve(flags.config)
    const cwd = dirname(configPath)
    const pidPath = join(this.config.configDir, 'xgsd.pid')

    if (flags.detached) {
      const pid = isBackgroundProcessRunning(pidPath)

      if (pid && !flags.force) {
        this.error('service is already running in the background.\nUse `worker up -c {path} -f`.')
      }

      if (pid && flags.force) {
        try {
          process.kill(pid as number, 'SIGTERM')
          rmSync(pidPath)
        } catch (error) {}
      }

      const daemonPath = resolve(__dirname, '..', 'api', 'daemon.js')
      const child = spawn(process.execPath, [daemonPath], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          XGSD_PORT: String(port),
          //XGSD_HOST: flags.host,
          XGSD_CWD: cwd,
          XGSD_CONFIG_PATH: configPath,
          XGSD_PID_PATH: pidPath,
        },
      })

      this.log(`server is running in the background (pid: ${child.pid})`)

      child.unref()
    } else {
      const server = await createServer({cwd, configPath})

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
