import {Command, Flags} from '@oclif/core'
import {dirname, join, resolve} from 'path'
import {createConsoleStreamWrapper, getWorkerConfig, resolveDependency, resolveInput} from '../util'
import {WorkerConfig} from '@xgsd/workers'
import {parse} from 'valibot'
import {WorkerConfigSchema} from '../validation'
import {createWriteStream} from 'fs'

export default class Run extends Command {
  static override description = 'Manually activates your Worker and streams logs to console'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    data: Flags.string({
      char: 'd',
      description: 'JSON string or path to JSON file',
    }),

    environment: Flags.string({
      char: 'e',
      multiple: true,
      multipleNonGreedy: false,
    }),

    config: Flags.string({char: 'c', required: true}),

    stdout: Flags.boolean({
      char: 'O',
      required: false,
      description:
        "when true, signals are piped to stdout vs stored to file (note: without this option you'll still see signal output)",
    }),

    input: Flags.boolean({
      char: 'i',
      description: 'worker input data is logged in JSON format',
      default: false,
    }),

    output: Flags.boolean({
      char: 'o',
      description: 'when true, worker output data will be logged in JSON format',
      default: false,
    }),

    silent: Flags.boolean({
      char: 's',
      description: 'no console logs, signals still persisted',
    }),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Run)

    const {environment} = flags

    const configPath = resolve(flags.config)
    const cwd = resolve(dirname(flags.config))
    const data = await resolveInput(flags.data)

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

    let stream: any = createWriteStream(signals, {flags: 'a'})
    if (flags.stdout) {
      stream = process.stdout
    }

    if (!flags.stdout && !flags.silent) {
      stream = createConsoleStreamWrapper(signals)
    }

    const opts = {
      config,
      stream,
      validator: (config: WorkerConfig) => parse(WorkerConfigSchema, config),
    }

    try {
      const handler = createHandler(opts)

      if (flags.input) this.logJson(data)

      const output = await handler({
        data,
        env,
        cwd,
      })

      if (flags.output) this.logJson(output)
    } catch (error: any) {
      console.log('fatal error occurred')
      console.log(error)
    }
  }
}
