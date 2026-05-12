import {Command, Flags} from '@oclif/core'
import {dirname, join, resolve} from 'path'
import {createConsoleStreamWrapper, getWorkerConfig, resolveInput} from '../util.js'
import {parse} from 'valibot'
import {WorkerConfigSchema} from '../validation.js'
import {createWriteStream} from 'fs'
import {createTransport} from '@xgsd/workers'

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

    worker: Flags.string({
      char: 'w',
      default: 'worker.js',
      description: 'path to your worker code (defaults to worker.js)',
    }),

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

    const entry = resolve(flags.worker)
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

    const signals = join(process.cwd(), 'signals.jsonl')
    let stream: any = createWriteStream(signals, {flags: 'a'})

    if (flags.stdout) {
      stream = process.stdout
    }

    if (!flags.stdout && !flags.silent) {
      stream = createConsoleStreamWrapper(signals)
    }

    const transport = createTransport({
      entry,
      stream,
      limits: {
        ttl: 15000,
        memory: 128,
      },
    })

    if (flags.input && !flags.json) {
      this.logJson(data)
    }

    try {
      const result = await transport({data, env})

      if (flags.output && !flags.json) {
        this.logJson(result)
      }

      return result
    } catch (error: any) {
      this.error(`${error.message} (${error.code ?? 'UNKNOWN'})`)
    }
  }
}
