# `@xgsd/worker-cli`

See the documentation for more info [**Documentation**](https://isolated-.github.io/xgsd-userdocs/workers)

## Install

```bash
npm install -g @xgsd/worker-cli
```

## Commands

<!-- commands -->
* [`worker run`](#worker-run)
* [`worker up`](#worker-up)
* [`worker version`](#worker-version)

## `worker run`

Manually activates your Worker and streams logs to console

```
USAGE
  $ worker run -c <value> [-d <value>] [-e <value>...] [-O] [-i] [-o] [-s]

FLAGS
  -O, --stdout                  when true, signals are piped to stdout vs stored to file (note: without this option
                                you'll still see signal output)
  -c, --config=<value>          (required)
  -d, --data=<value>            JSON string or path to JSON file
  -e, --environment=<value>...
  -i, --input                   worker input data is logged in JSON format
  -o, --output                  when true, worker output data will be logged in JSON format
  -s, --silent                  no console logs, signals still persisted

DESCRIPTION
  Manually activates your Worker and streams logs to console

EXAMPLES
  $ worker run
```

_See code: [src/commands/run.ts](https://github.com/Isolated-/xgsd-worker-cli/blob/v0.1.0-beta.0/src/commands/run.ts)_

## `worker up`

Start a server to call your Worker over HTTP

```
USAGE
  $ worker up -c <value> [-p <value>] [-d] [-f] [-s]

FLAGS
  -c, --config=<value>  (required)
  -d, --detached
  -f, --force
  -p, --port=<value>    [default: 3000]
  -s, --down            use this flag to stop background process

DESCRIPTION
  Start a server to call your Worker over HTTP

EXAMPLES
  $ worker up
```

_See code: [src/commands/up.ts](https://github.com/Isolated-/xgsd-worker-cli/blob/v0.1.0-beta.0/src/commands/up.ts)_

## `worker version`

```
USAGE
  $ worker version [--json] [--verbose]

FLAGS
  --verbose  Show additional information about the CLI.

GLOBAL FLAGS
  --json  Format output as json.

FLAG DESCRIPTIONS
  --verbose  Show additional information about the CLI.

    Additionally shows the architecture, node version, operating system, and versions of plugins that the CLI is using.
```

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/2.2.43/src/commands/version.ts)_
<!-- commandsstop -->
