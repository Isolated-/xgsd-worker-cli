# xGSD Lite Runtime

A minimal, serverless-style execution runtime for running isolated JavaScript/TypeScript “blocks” with predictable lifecycle, strict time limits, and lightweight middleware support.

This runtime is designed as a simplified alternative to the full xGSD engine — focusing on fast execution, low memory usage, and deterministic behaviour.

---

## Why Lite Runtime?

The full xGSD runtime supports:

- plugins
- event systems
- retries
- extensions
- complex orchestration

While powerful, this introduces:

- unpredictable execution paths
- higher memory overhead
- complex lifecycle management

**xGSD Lite Runtime removes all of that.**

It instead provides:

- one input
- one execution
- one result
- one hard TTL (time-to-live)
- optional middleware chain

---
