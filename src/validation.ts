import * as v from 'valibot'

export const WorkerConfigSchema = v.object({
  entry: v.string(),

  dist: v.optional(v.string(), '.xgsd'),

  bundler: v.optional(
    v.object({
      enabled: v.optional(v.boolean(), undefined),

      cache: v.optional(
        v.object({
          strategy: v.optional(v.union([v.literal('always'), v.literal('change'), v.literal('never')]), undefined),
        }),
        {},
      ),
    }),
    {},
  ),

  limits: v.optional(
    v.object({
      ttl: v.optional(v.number(), 5000),
      memory: v.optional(v.number(), 64),
      concurrency: v.optional(v.number(), 32),
    }),
    {},
  ),

  output: v.optional(
    v.object({
      mode: v.optional(v.union([v.literal('raw'), v.literal('wrapped')]), 'wrapped'),
    }),
    {},
  ),
})
