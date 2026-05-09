import {Command, Flags} from '@oclif/core'
import {dirname, resolve} from 'path'
import {getWorkerConfig, resolveDependency} from '../util'

export default class Run extends Command {
  static override description = 'describe the command here'
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
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Run)

    let env: Record<string, any> = {}
    const {data, environment} = flags

    const configPath = resolve(flags.config)
    const cwd = resolve(dirname(flags.config))

    ;(environment ?? []).map((e) => {
      const [key, value] = e.split('=')

      if (!key || !value) {
        this.warn(`dropping key "${key}" with value "${value}"`)
        return
      }

      env[key] = value
    })

    // TODO: make this option
    // load defaults with Joi
    const config = await getWorkerConfig(configPath)
    if (!config) {
      this.error(`config not found at ${configPath}`)
    }

    const {createHandler} = resolveDependency('@xgsd/workers', cwd)

    try {
      const handler = createHandler(config)

      const result = await handler({
        data,
        env,
        cwd,
      })

      this.log(`[cli] execution completed in ${result.duration.toFixed(2)} ms`)

      this.logJson(result)
    } catch (error: any) {
      console.log(error)
    }
  }
}
