---
paths:
  - "src/modules/**"
  - "src/core/**"
---

# Module System Architecture

Each feature is a self-contained module under `src/modules/`. The core bot infrastructure loads modules, collects their commands, and routes events — modules don't know about each other.

```typescript
interface BotModule {
  name: string;
  commands: SlashCommandBuilder[];
  registerEvents(client: Client): void;
  onReady?(client: Client): Promise<void>;
  onShutdown?(): Promise<void>;
}
```

The module loader in `core/bot.ts`:
1. Imports each module from `src/modules/*/index.ts`
2. Collects all commands -> registers with Discord in one batch
3. Routes `interactionCreate` to the right module based on command name
4. Calls lifecycle hooks (`onReady`, `onShutdown`) for all modules

No plugin framework, no dynamic loading, no dependency injection. Just directories, an interface, and a loop.

## Rules
- Follow the `BotModule` interface exactly — don't extend it without updating `core/module.ts`
- Module code stays in its `src/modules/{name}/` directory — never leak into `core/`
- When modifying the `BotModule` interface, update all existing modules
- Don't create stub modules for future features — only build what's needed now
