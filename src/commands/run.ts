import {Command, Flags} from '@oclif/core'
import {dirname, join, resolve} from 'path'
import {createConsoleStreamWrapper, getWorkerConfig, resolveDependency} from '../util'
import {WorkerConfig} from '@xgsd/workers'
import {parse} from 'valibot'
import {WorkerConfigSchema} from '../validation'

export default class Run extends Command {
  static override description = 'Manually activates your Worker and streams logs to console'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    data: Flags.string({
      char: 'd',
      parse: (input) => JSON.parse(input),
    }),

    environment: Flags.string({
      char: 'e',
      multiple: true,
      multipleNonGreedy: false,
    }),

    config: Flags.string({char: 'c', required: true}),

    stdout: Flags.boolean({
      char: 'o',
      required: false,
      description:
        "when true, signals are piped to stdout vs stored to file (note: without this option you'll still see signal output)",
    }),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Run)

    const {data, environment} = flags

    const configPath = resolve(flags.config)
    const cwd = resolve(dirname(flags.config))

    let env: Record<string, any> = {}
    ;(environment ?? []).map((e) => {
      const [key, value] = e.split('=')

      if (!key || !value) {
        this.warn(`dropping key "${key}" with value "${value}"`)
        return
      }

      env[key] = value
    })

    const config = await getWorkerConfig(configPath)
    if (!config) {
      this.error(`config not found at ${configPath}`)
    }

    const {createHandler} = resolveDependency('@xgsd/workers', cwd)

    const signals = join(cwd, config.dist, 'signals.jsonl')
    const stream = flags.stdout ? process.stdout : createConsoleStreamWrapper(signals)

    const opts = {
      config,
      stream,
      validator: (config: WorkerConfig) => parse(WorkerConfigSchema, config),
    }

    try {
      const handler = createHandler(opts)

      await handler({
        data,
        env,
        cwd,
      })
    } catch (error: any) {
      console.log('fatal error occurred')
      console.log(error)
    }
  }
}
