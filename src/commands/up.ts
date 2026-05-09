import {Args, Command, Flags} from '@oclif/core'
import {createServer} from '../api/server'
import {dirname, resolve} from 'path'

export default class Up extends Command {
  static override args = {}
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    port: Flags.integer({char: 'p', default: 3000}),

    config: Flags.string({char: 'c', required: true}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Up)
    const port = flags.port

    const configPath = resolve(flags.config)
    const cwd = dirname(configPath)

    const server = createServer({cwd, configPath})

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
